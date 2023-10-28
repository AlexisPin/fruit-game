import type { FruitType } from "./Fruit";

type ClientToServerMessage =
  | "Ready"
  | {
      Drop: {
        x: number;
      };
    };

export function writeClientMessage(msg: ClientToServerMessage) {
  if (msg === "Ready") {
    return new Uint8Array();
  } else if ("Drop" in msg) {
    const buffer = new Uint8Array(5);
    const view = new DataView(buffer.buffer);
    view.setUint8(0, 1);
    view.setFloat64(1, msg.Drop.x, true);
    return buffer;
  }
}

type ServerToClientMessage =
  | {
      PlayerJoined: {
        name: string;
      };
    }
  | {
      PlayerLeft: {
        name: string;
      };
    }
  | "GameStart"
  | {
      BoardUpdate: {
        player: string;
        board: {
          rapier_state: Uint8Array;
          fruit_data: Map<number, FruitType>;
        };
      };
    }
  | "GameEnd";

const decoder = new TextDecoder();

export function writeServerMessage(bin: Uint8Array): ServerToClientMessage {
  const view = new DataView(bin.buffer);
  const tag = view.getUint8(0);

  switch (tag) {
    case 0: {
      const name_length = view.getUint32(1, true);
      return {
        PlayerJoined: {
          name: decoder.decode(bin.slice(5, 5 + name_length)),
        },
      };
    }
    case 1: {
      const name_length = view.getUint32(1, true);
      return {
        PlayerLeft: {
          name: decoder.decode(bin.slice(5, 5 + name_length)),
        },
      };
    }
    case 2: {
      return "GameStart";
    }
    case 3: {
      const player_length = view.getUint32(1, true);
      const player = decoder.decode(bin.slice(5, 5 + player_length));
      const rapier_state_length = view.getUint32(5 + player_length, true);
      const rapier_state = bin.slice(
        9 + player_length,
        9 + player_length + rapier_state_length
      );
      const fruit_data_length = view.getUint32(
        9 + player_length + rapier_state_length,
        true
      );
      const fruit_data = new Map();

      for (let i = 0; i < fruit_data_length; i++) {
        const handle = view.getFloat64(
          13 + player_length + rapier_state_length + i * 12,
          true
        );
        const fruit_type = view.getUint8(
          17 + player_length + rapier_state_length + i * 12
        );
        fruit_data.set(handle, fruit_type);
      }

      return {
        BoardUpdate: {
          player,
          board: {
            rapier_state,
            fruit_data,
          },
        },
      };
    }
    case 4: {
      return "GameEnd";
    }
    default: {
      throw new Error(`Unknown message tag: ${tag}`);
    }
  }
}

// const handle_builder_cache = new Float64Array(1);
// const handle_builder_cache_view = new DataView(handle_builder_cache.buffer);
// function build_handle(i: number, g: number) {
//   handle_builder_cache_view.setUint32(0, i, true);
//   handle_builder_cache_view.setUint32(4, g, true);
//   return handle_builder_cache[0];
// }
