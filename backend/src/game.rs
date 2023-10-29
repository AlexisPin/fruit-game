use speedy::{Readable, Writable};

use crate::lobby::BoardState;

#[derive(Readable, Debug)]
#[repr(u8)]
#[speedy(tag_type = u8)]
pub enum ClientToServerMessage {
	Drop { board: BoardState  },
}

#[derive(Writable, Debug, Clone)]
#[repr(u8)]
#[speedy(tag_type = u8)]
pub enum ServerToClientMessage {
	PlayerJoined { name: String },
	PlayerLeft { name: String },
	GameStart,
	BoardUpdate { player: String, board: BoardState },
	GameEnd,
}
