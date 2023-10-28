use speedy::{Readable, Writable};

use crate::lobby::BoardState;

#[derive(Readable, Debug)]
#[repr(u8)]
pub enum CLientToServerMessage {
	Ready,
	Drop { x: f64 },
}

#[derive(Writable, Debug)]
#[repr(u8)]
pub enum ServerToClientMessage {
	PlayerJoinded { name: String },
	PlayerLeft { name: String },
	GameStart,
	BoardUpdate { player: String, board: BoardState },
	GameEnd,
}
