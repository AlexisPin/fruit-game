export function createWorld(RAPIER: typeof import("@dimforge/rapier2d")) {
  const world = new RAPIER.World({ x: 0.0, y: 98.1 * 2 });

  const offset = { x: 100, y: 50 };
  const ground = RAPIER.ColliderDesc.cuboid(313 / 2, 10);
  ground.translation = { x: 313 / 2 + offset.x, y: 351 + 10 + offset.y };
  world.createCollider(ground);

  const leftWall = RAPIER.ColliderDesc.cuboid(10, 351 / 2);
  leftWall.translation = { x: offset.x + 10, y: 351 / 2 + offset.y };
  world.createCollider(leftWall);

  const rightWall = RAPIER.ColliderDesc.cuboid(10, 351 / 2);
  rightWall.translation = { x: offset.x + 313 - 10, y: 351 / 2 + offset.y };
  world.createCollider(rightWall);
  return world;
}