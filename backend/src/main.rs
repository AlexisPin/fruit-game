use std::{collections::HashMap, net::SocketAddr, sync::Arc};

use axum::{
	extract::{ws::Message, Path, Query, State, WebSocketUpgrade},
	http::StatusCode,
	response::{IntoResponse, Response},
	routing::{get, post},
	Router,
};
use lobby::{Lobby, LobbyMessage, LobbyMessageInner};
use speedy::{Readable, Writable};
use tokio::sync::{
	mpsc::{self, error::SendError, Sender},
	oneshot,
};
use tower_http::cors::{Any, CorsLayer};

use crate::game::ClientToServerMessage;

mod game;
mod lobby;

#[tokio::main]
async fn main() {
	let (tx, rx) = mpsc::channel(10);

	tokio::spawn(lobby::start_thread(rx));

	let app = Router::new()
		.route("/lobby/create", post(create_lobby))
		.route("/lobby/find", post(find_lobby))
		.route("/game/:code", get(game_websocket))
		.with_state(Arc::new(tx))
		.layer(CorsLayer::new().allow_origin(Any));

	let addr = SocketAddr::from(([127, 0, 0, 1], 3000));

	axum::Server::bind(&addr)
		.serve(app.into_make_service())
		.await
		.unwrap();
}

async fn game_websocket(
	ws: WebSocketUpgrade,
	State(state): State<SenderState>,
	Query(params): Query<HashMap<String, String>>,
	Path(code): Path<String>,
) -> impl IntoResponse {
	if !params.contains_key("name") {
		return (StatusCode::BAD_REQUEST, "Missing name").into_response();
	}
	let name = params.get("name").unwrap().to_string();
	ws.on_upgrade(|mut socket| async move {
		println!("{name} connected");
		let (tx, mut rx) = mpsc::channel(100);
		send_lobby_message(
			&state,
			LobbyMessageInner::Join {
				code: code.clone(),
				name: name.clone(),
				socket: tx,
			},
		)
		.await
		.unwrap();

		loop {
			tokio::select! {
						message = rx.recv() => {
						let message = message.expect("channel closed");
						let bin = message.write_to_vec().unwrap();
						socket.send(Message::Binary(bin)).await.unwrap();
						},
						message = socket.recv() => {
						if message.is_none() {
						  break;
						}
						let message = message.unwrap().expect("Bad socket message");
						let message: ClientToServerMessage = match message {
						  Message::Binary(bin) => {
							let message = ClientToServerMessage::read_from_buffer(&bin).unwrap();
							message
						  },
						  _ => continue,
						};
			println!("Received message: {:?}", message);
						match message {
					ClientToServerMessage::Drop { board } => {
              send_lobby_message(&state, LobbyMessageInner::UpdateBoard { code: code.clone(), name: name.clone(), board }).await.unwrap();
			},
				}
								}
							}
		}
		println!("{name} disconnected");
		send_lobby_message(
			&state,
			LobbyMessageInner::Leave {
				code: code.clone(),
				name: name.clone(),
			},
		)
		.await
		.unwrap();
	})
}

type SenderState = Arc<Sender<LobbyMessage>>;

async fn send_lobby_message(
	state: &SenderState,
	message: LobbyMessageInner,
) -> Result<oneshot::Receiver<anyhow::Result<Lobby>>, SendError<LobbyMessage>> {
	let (tx, rx) = oneshot::channel();

	state
		.send(LobbyMessage {
			reply_channel: tx,
			message,
		})
		.await?;

	Ok(rx)
}

async fn create_lobby(State(state): State<SenderState>) -> Response {
	let rx = send_lobby_message(&state, LobbyMessageInner::Create)
		.await
		.unwrap();

	let lobby = rx.await.unwrap().unwrap();
	lobby.code.into_response()
}

async fn find_lobby(
	State(state): State<SenderState>,
	Query(params): Query<HashMap<String, String>>,
) -> Response {
	if !params.contains_key("name") {
		return (StatusCode::BAD_REQUEST, "Missing name").into_response();
	}
	let rx = send_lobby_message(
		&state,
		LobbyMessageInner::Find {
			name: params.get("name").unwrap().to_string(),
		},
	)
	.await
	.unwrap();

	let lobby = rx.await.unwrap().unwrap();
	lobby.code.into_response()
}
