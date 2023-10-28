use std::{collections::HashMap, net::SocketAddr, sync::Arc};

use axum::{
	extract::{Query, State, WebSocketUpgrade},
	http::StatusCode,
	response::{IntoResponse, Response},
	routing::{get, post},
	Router,
};
use lobby::{Lobby, LobbyMessage, LobbyMessageInner};
use tokio::sync::{
	mpsc::{self, error::SendError, Sender},
	oneshot,
};
use tower_http::cors::{Any, CorsLayer};

mod game;
mod lobby;

#[tokio::main]
async fn main() {
	let (tx, rx) = mpsc::channel(10);

	tokio::spawn(lobby::start_thread(rx));

	let app = Router::new()
		.route("/lobby/create", post(create_lobby))
		.route("/lobby/join", post(join_lobby))
		.route("/lobby/find", get(find_lobby))
		.route("/game/:id", get(game_websocket))
		.with_state(Arc::new(tx))
		.layer(CorsLayer::new().allow_origin(Any));

	let addr = SocketAddr::from(([127, 0, 0, 1], 3000));

	axum::Server::bind(&addr)
		.serve(app.into_make_service())
		.await
		.unwrap();
}

async fn game_websocket(ws: WebSocketUpgrade) -> impl IntoResponse {
	ws.on_upgrade(|socket| async move {})
}

type SenderState = Arc<Sender<LobbyMessage>>;

async fn send_lobby_message(
	state: SenderState,
	message: LobbyMessageInner,
) -> Result<oneshot::Receiver<Result<Lobby, String>>, SendError<LobbyMessage>> {
	let (tx, rx) = oneshot::channel();

	state
		.send(LobbyMessage {
			reply_channel: tx,
			message,
		})
		.await?;

	Ok(rx)
}

async fn create_lobby(
	State(state): State<SenderState>,
	Query(params): Query<HashMap<String, String>>,
) -> Response {
	if !params.contains_key("name") {
		return (StatusCode::BAD_REQUEST, "Missing name").into_response();
	}
	let rx = send_lobby_message(
		state,
		LobbyMessageInner::Create {
			name: params.get("name").unwrap().to_string(),
		},
	)
	.await
	.unwrap();

	let lobby = rx.await.unwrap().unwrap();
	lobby.code.into_response()
}

async fn join_lobby(
	State(state): State<SenderState>,
	Query(params): Query<HashMap<String, String>>,
) -> Response {
	if !params.contains_key("code") {
		return (StatusCode::BAD_REQUEST, "Missing code").into_response();
	}
	if !params.contains_key("name") {
		return (StatusCode::BAD_REQUEST, "Missing name").into_response();
	}
	let rx = send_lobby_message(
		state,
		LobbyMessageInner::Join {
			name: params.get("name").unwrap().to_string(),
			code: params.get("code").unwrap().to_string(),
		},
	)
	.await
	.unwrap();

	let lobby = rx.await.unwrap();

	match lobby {
		Ok(lobby) => lobby.code.into_response(),
		Err(msg) => (StatusCode::BAD_REQUEST, msg).into_response(),
	}
}
async fn find_lobby(
	State(state): State<SenderState>,
	Query(params): Query<HashMap<String, String>>,
) -> Response {
	if !params.contains_key("name") {
		return (StatusCode::BAD_REQUEST, "Missing name").into_response();
	}
	let rx = send_lobby_message(
		state,
		LobbyMessageInner::Find {
			name: params.get("name").unwrap().to_string(),
		},
	)
	.await
	.unwrap();

	let lobby = rx.await.unwrap().unwrap();
	lobby.code.into_response()
}
