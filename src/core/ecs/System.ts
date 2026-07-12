import { World } from "./World";

export interface System {
  readonly name: string;
  /**Other system names that must execute before this one */
  readonly dependencies: string[];
  /**Called once per rendered frame, dt is in seconds */
  execute(world: World, dt: number): void;
  /**Optional: called once on first registration. */
  onInit?(world: World): void;
  /**Optional: called on engine shutdown */
  onDestroy?(world: World): void;
}

// === Topological sort using Kahn's algorithm ===

export function topologicalSort(systems: System[]): System[] {
  const byName = new Map<string, System>(systems.map((s) => [s.name, s]));
  // In-degree map
  const inDegree = new Map<string, number>(systems.map((s) => [s.name, 0]));
  // Adjacency list: depender -> set of systems that depend on depender
  const edges = new Map<string, string[]>();

  for (const sys of systems) {
    edges.set(sys.name, []);
  }

  for (const sys of systems) {
    for (const dep of sys.dependencies) {
      if (!byName.has(dep)) {
        throw new Error(
          `System '${sys.name}' depends on unregistered system '${dep}'`,
        );
      }
      edges.get(dep)!.push(sys.name);
      inDegree.set(sys.name, (inDegree.get(sys.name) ?? 0) + 1);
    }
  }

  //   Queue of systems with no unmet dependencies
  const queue: string[] = [];
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name);
  }

  const sorted: System[] = [];
  while (queue.length > 0) {
    const name = queue.shift()!;
    sorted.push(byName.get(name)!);
    for (const next of edges.get(name) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  if (sorted.length !== systems.length) {
    const cycleMembers = systems
      .filter((s) => !sorted.includes(s))
      .map((s) => s.name)
      .join(",");

    throw new Error(
      `System dependency cycle detected among: [${cycleMembers}]`,
    );
  }

  return sorted;
}
