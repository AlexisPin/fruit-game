use std::{collections::HashMap, ops::Range};

use anyhow::{anyhow, bail};
use fastrand::Rng;
use speedy::{Readable, Writable};
use tokio::sync::{
	mpsc::{Receiver, Sender},
	oneshot,
};

use crate::game::ServerToClientMessage;

#[derive(Debug, Clone)]
pub struct Lobby {
	pub code: String,
	pub players: HashMap<String, Sender<ServerToClientMessage>>,
	pub game_state: GameState,
}

impl Lobby {
	fn broadcast(&mut self, message: ServerToClientMessage) {
		for player in self.players.values() {
			player.try_send(message.clone()).ok();
		}
	}
	fn broadcast_except(&mut self, filter: &str, message: ServerToClientMessage) {
		for (name, ws) in self.players.iter() {
			if name == filter {
				continue;
			}
			ws.try_send(message.clone()).ok();
		}
	}

	fn advance_state(&mut self) {
		match &self.game_state {
			GameState::WaitingForPlayers => {
				if self.players.len() == 2 {
					let mut board_states = HashMap::new();
					for player in self.players.keys() {
						board_states.insert(player.clone(), BoardState::new());
					}
					self.game_state = GameState::Playing { board_states };
					self.broadcast(ServerToClientMessage::GameStart);
				}
			}
			GameState::Playing { board_states } => {
				if self.players.len() != 2 {
					self.game_state = GameState::Ended;
					self.broadcast(ServerToClientMessage::GameEnd);
				}
			}
			GameState::Ended => {}
		}
	}

	fn can_add_player(&self, name: &str) -> bool {
		self.players.len() < 2 && !self.players.contains_key(name)
	}

	fn add_player(
		&mut self,
		name: String,
		socket: Sender<ServerToClientMessage>,
	) -> anyhow::Result<()> {
		if self.players.len() >= 2 {
			bail!("Lobby full");
		}
		if self.players.contains_key(&name) {
			bail!("Name already taken");
		}
		self.players.insert(name.clone(), socket);
		self.broadcast(ServerToClientMessage::PlayerJoined { name });
		self.advance_state();
		Ok(())
	}

	fn update_board(&mut self, name: String, board: BoardState) -> anyhow::Result<()> {
		if let GameState::Playing { board_states } = &mut self.game_state {
			board_states.insert(name.clone(), board.clone());
		} else {
			bail!("Game not started");
		}
		self.broadcast_except(
			&name,
			ServerToClientMessage::BoardUpdate {
				player: name.clone(),
				board,
			},
		);
		self.advance_state();
		Ok(())
	}

	fn remove_player(&mut self, name: String) {
		self.players.remove(&name);
		self.broadcast(ServerToClientMessage::PlayerLeft { name });
		self.advance_state();
	}
}

#[derive(Debug, Clone, Readable, Writable)]

pub struct BoardState {
	pub rapier_state: Vec<u8>,
	pub fruit_data: HashMap<(u32, u32), FruitType>,
}

impl BoardState {
	pub fn new() -> Self {
		Self {
			rapier_state: vec![],
			fruit_data: HashMap::new(),
		}
	}
}

#[derive(Debug, Clone, Readable, Writable)]
#[repr(u8)]

pub enum FruitType {
	Cherry = 0,
	Strawberry = 1,
	Grape = 2,
	Orange = 3,
	Persimmon = 4,
	Apple = 5,
	Yuzu = 6,
	Peach = 7,
	Pineapple = 8,
	Honeydew = 9,
	Watermelon = 10,
}

#[derive(Debug, Clone)]
pub enum GameState {
	WaitingForPlayers,
	Playing {
		board_states: HashMap<String, BoardState>,
	},
	Ended,
}

pub struct LobbyMessage {
	pub reply_channel: oneshot::Sender<anyhow::Result<Lobby>>,
	pub message: LobbyMessageInner,
}

pub enum LobbyMessageInner {
	Create,
	Find {
		name: String,
	},
	Join {
		name: String,
		code: String,
		socket: Sender<ServerToClientMessage>,
	},
	Leave {
		name: String,
		code: String,
	},
	UpdateBoard {
		code: String,
		name: String,
		board: BoardState,
	},
}

pub async fn start_thread(mut rx: Receiver<LobbyMessage>) {
	let mut lobbies: HashMap<String, Lobby> = HashMap::new();
	let mut rng = fastrand::Rng::new();

	loop {
		let message = rx.recv().await.expect("channel closed");

		match message.message {
			LobbyMessageInner::Create => {
				let code = generate_lobby_code(&lobbies, &mut rng);
				let lobby = Lobby {
					code: code.clone(),
					players: HashMap::new(),
					game_state: GameState::WaitingForPlayers,
				};
				lobbies.insert(code, lobby.clone());
				message
					.reply_channel
					.send(Ok(lobby))
					.expect("Failed to reply")
			}
			LobbyMessageInner::Join { name, code, socket } => {
				if let Some(lobby) = lobbies.get_mut(&code) {
					let res = lobby.add_player(name, socket);
					if let Err(err) = res {
						message
							.reply_channel
							.send(Err(err))
							.expect("Failed to reply");
					}
				} else {
					message
						.reply_channel
						.send(Err(anyhow!("Lobby not found")))
						.expect("Failed to reply");
				}
			}
			LobbyMessageInner::Find { name } => {
				let lobby = lobbies
					.values_mut()
					.find(|lobby| lobby.can_add_player(&name));

				if let Some(lobby) = lobby {
					message
						.reply_channel
						.send(Ok(lobby.clone()))
						.expect("Failed to reply");
				} else {
					let code = generate_lobby_code(&lobbies, &mut rng);
					let lobby = Lobby {
						code: code.clone(),
						players: HashMap::new(),
						game_state: GameState::WaitingForPlayers,
					};
					lobbies.insert(code, lobby.clone());
					message
						.reply_channel
						.send(Ok(lobby))
						.expect("Failed to reply")
				}
			}
			LobbyMessageInner::Leave { name, code } => {
				if let Some(lobby) = lobbies.get_mut(&code) {
					lobby.remove_player(name);
					if lobby.players.is_empty() {
						lobbies.remove(&code);
					}
				}
			}
			LobbyMessageInner::UpdateBoard { code, name, board } => {
				if let Some(lobby) = lobbies.get_mut(&code) {
					lobby.update_board(name, board);
				}
			}
		}
	}
}

fn generate_lobby_code(lobbies: &HashMap<String, Lobby>, rng: &mut Rng) -> String {
	let mut code = generate_code(rng);

	while lobbies.contains_key(&code) {
		code = generate_code(rng);
	}
	code
}

const CODE_CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH: usize = 8;
static CHARSET_RANGE: Range<usize> = 0..CODE_CHARSET.len();

fn generate_code(rng: &mut Rng) -> String {
	let mut result = String::with_capacity(CODE_LENGTH);

	unsafe {
		for _ in 0..CODE_LENGTH {
			let index = rng.usize(CHARSET_RANGE.clone());
			result.push(*CODE_CHARSET.get_unchecked(index) as char);
		}
	}
	result
}
