<script lang="ts">
  import { onMount } from "svelte";
  import Board from "./Board.svelte";
  import { readServerMessage, type ClientToServerMessage, writeClientMessage } from "./ws";


let ws : WebSocket;

function send(msg : ClientToServerMessage) {
  const bin = writeClientMessage(msg);
  ws.send(bin!);
}

  onMount(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const name = params.get("name");
    ws = new WebSocket(`ws://localhost:3000/game/${code}?name=${name}`);
    ws.binaryType = "arraybuffer";
    ws.addEventListener("message", (event) => {      
      const msg = readServerMessage(event.data);
      console.log(msg);
    });

    return () => {
      ws.close();
    };
  });
</script>

<main class="flex items-stretch w-screen h-screen">
  <Board on:drop={(board) => {send({Drop : {
    board : board.detail
  }})}} />
  <Board other />
</main>
