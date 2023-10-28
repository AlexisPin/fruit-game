use std::{
	collections::{HashMap, HashSet},
	ops::Range,
};

use fastrand::Rng;
use speedy::{Readable, Writable};
use tokio::sync::{mpsc::Receiver, oneshot};

#[derive(Debug, Clone)]
pub struct Lobby {
	pub code: String,
	pub players: Vec<String>,
	pub game_state: GameState,
}

#[derive(Debug, Clone, Readable, Writable)]

pub struct BoardState {
	pub rapier_state: Vec<u8>,
	pub fruit_data: HashMap<(u32, u32), FruitType>,
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
	WaitingForReady {
		ready_players: HashSet<String>,
	},
	Playing {
		bored_state: HashMap<String, BoardState>,
	},
	Ended {
		winner: String,
	},
}

pub struct LobbyMessage {
	pub reply_channel: oneshot::Sender<Result<Lobby, String>>,
	pub message: LobbyMessageInner,
}

pub enum LobbyMessageInner {
	Create { name: String },
	Join { name: String, code: String },
	Find { name: String },
	Leave { name: String, code: String },
}

pub async fn start_thread(mut rx: Receiver<LobbyMessage>) {
	let mut lobbies: HashMap<String, Lobby> = HashMap::new();
	let mut rng = fastrand::Rng::new();

	loop {
		let message = rx.recv().await.expect("channel closed");

		match message.message {
			LobbyMessageInner::Create { name } => {
				let code = generate_lobby_code(&lobbies, &mut rng);
				let lobby = Lobby {
					code: code.clone(),
					players: vec![name.clone()],
					game_state: GameState::WaitingForPlayers,
				};
				lobbies.insert(code, lobby.clone());
				message
					.reply_channel
					.send(Ok(lobby))
					.expect("Failed to reply")
			}
			LobbyMessageInner::Join { name, code } => {
				if let Some(lobby) = lobbies.get_mut(&code) {
					if lobby.players.len() >= 2 {
						message
							.reply_channel
							.send(Err("Lobby full".into()))
							.expect("Failed to reply");
						continue;
					}
					if lobby.players.contains(&name) {
						message
							.reply_channel
							.send(Err("Name already taken".into()))
							.expect("Failed to reply");
						continue;
					}
					lobby.players.push(name.clone());
					message
						.reply_channel
						.send(Ok(lobby.clone()))
						.expect("Failed to reply");
				} else {
					message
						.reply_channel
						.send(Err("Lobby not found".into()))
						.expect("Failed to reply");
				}
			}
			LobbyMessageInner::Find { name } => {
				let lobby = lobbies
					.values_mut()
					.find(|lobby| lobby.players.len() < 2 && !lobby.players.contains(&name));

				if let Some(lobby) = lobby {
					lobby.players.push(name.clone());
					message
						.reply_channel
						.send(Ok(lobby.clone()))
						.expect("Failed to reply");
				} else {
					let code = generate_lobby_code(&lobbies, &mut rng);
					let lobby = Lobby {
						code: code.clone(),
						players: vec![name.clone()],
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
					lobby.players.retain(|player| player != &name);
					if lobby.players.is_empty() {
						lobbies.remove(&code);
					}
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
