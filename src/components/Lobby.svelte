<script lang="ts">
  let name = "";
  let join_code = "";
</script>

<button
  disabled={name === ""}
  class="bg-neutral-400 enabled:hover::bg-neutral-300 rounded-md px-2 py-1"
  on:click={async () => {
    const res = await fetch("http://localhost:3000/lobby/create?name=" + name, {
      method: "POST",
    });
    const code = await res.text();
    location.href = `/game?code=${code}`;
  }}>Create Game</button
>
<hr class="w-96" />
<input
  class="border-neutral-400 border rounded-md px-2 py-1"
  type="text"
  placeholder="Lobby Code"
  bind:value={join_code}
/>
<button
  disabled={name === "" || join_code.length !== 8}
  class="bg-neutral-400 enabled:hover::bg-neutral-300 rounded-md px-2 py-1"
  on:click={async () => {
    const res = await fetch(
      `http://localhost:3000/lobby/join?code=${join_code}&name=${name}`,
      {
        method: "POST",
      }
    );
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const code = await res.text();
    location.href = `/game?code=${code}`;
  }}>Join Game</button
>
<hr class="w-96" />

<button
  disabled={name === ""}
  class="bg-neutral-400 enabled:hover::bg-neutral-300 rounded-md px-2 py-1"
  on:click={async () => {
    const res = await fetch("http://localhost:3000/lobby/find?name=" + name, {
      method: "POST",
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const code = await res.text();
    location.href = `/game?code=${code}`;
  }}>Find Random lobby</button
>

<input
  type="text"
  class="border-neutral-400 mt-16 border rounded-md px-2 py-1"
  placeholder="Username"
  bind:value={name}
/>
