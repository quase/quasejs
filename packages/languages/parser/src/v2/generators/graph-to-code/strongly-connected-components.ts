// Based on https://en.wikipedia.org/wiki/Path-based_strong_component_algorithm

export type BaseComponentEdge<T, N> = readonly [N, T, N];

export class BaseComponent<T, N> {
  readonly id: number;
  readonly nodes: Set<N>;
  readonly nodeToComponent: ReadonlyMap<N, BaseComponent<T, N>>;
  readonly outEdges: BaseComponentEdge<T, N>[];
  readonly inEdges: BaseComponentEdge<T, N>[];
  // Entry points (nodes reachable from outside)
  readonly entries: Set<N>;
  // Exit points (nodes that reach the outside)
  readonly exits: Set<N>;

  constructor(
    id: number,
    nodeToComponent: ReadonlyMap<N, BaseComponent<T, N>>
  ) {
    this.id = id;
    this.nodes = new Set();
    this.nodeToComponent = nodeToComponent;
    this.outEdges = [];
    this.inEdges = [];
    this.entries = new Set();
    this.exits = new Set();
  }

  *destinations() {
    for (const [_, _2, dest] of this.outEdges) {
      yield this.nodeToComponent.get(dest)!!;
    }
  }

  *[Symbol.iterator]() {
    for (const [_, transition, dest] of this.outEdges) {
      yield [transition, this.nodeToComponent.get(dest)!!] as const;
    }
  }
}

type SCCResult<T, N> = {
  readonly components: readonly BaseComponent<T, N>[];
  readonly nodeToComponent: ReadonlyMap<N, BaseComponent<T, N>>;
};

export abstract class BaseSCC<T, N> {
  abstract destinations(node: N): IterableIterator<N>;

  abstract outEdges(node: N): IterableIterator<readonly [T, N]>;

  private connect(
    component: BaseComponent<T, N>,
    nodeToComponent: Map<N, BaseComponent<T, N>>
  ) {
    for (const node of component.nodes) {
      for (const [transition, dest] of this.outEdges(node)) {
        const otherComponent = nodeToComponent.get(dest)!!;
        if (component !== otherComponent) {
          const tuple = [node, transition, dest] as const;
          component.outEdges.push(tuple);
          component.exits.add(node);
          otherComponent.inEdges.push(tuple);
          otherComponent.entries.add(dest);
        }
      }
    }
  }

  process(nodes: Iterable<N>): SCCResult<T, N> {
    const s: N[] = [];
    const p: N[] = [];
    let c = 0;
    const order = new Map<N, number>();
    const components: BaseComponent<T, N>[] = [];
    const nodeToComponent = new Map<N, BaseComponent<T, N>>();

    function search(self: BaseSCC<T, N>, v: N) {
      // 1. Set the preorder number of v to C, and increment C
      order.set(v, c);
      c++;

      // 2. Push v onto S and also onto P
      s.push(v);
      p.push(v);

      // 3. For each edge from v to a neighboring vertex w
      for (const w of self.destinations(v)) {
        const preorder = order.get(w);
        if (preorder == null) {
          // If the preorder number of w has not yet been assigned, recursively search w
          search(self, w);
        } else {
          // Otherwise, if w has not yet been assigned to a strongly connected component:
          if (!nodeToComponent.has(v)) {
            // Repeatedly pop vertices from P until the top element of P has a preorder number less than or equal to the preorder number of w
            while (order.get(p[p.length - 1])!! > preorder) {
              p.pop();
            }
          }
        }
      }

      // 4. If v is the top element of P
      if (v === p[p.length - 1]) {
        // Pop vertices from S until v has been popped, and assign the popped vertices to a new component
        const component = new BaseComponent<T, N>(
          components.length,
          nodeToComponent
        );
        do {
          const x = s.pop()!!;
          component.nodes.add(x);
          nodeToComponent.set(x, component);
          if (x === v) break;
        } while (true);
        components.push(component);

        // Pop v from P
        p.pop();
      }
    }

    for (const node of nodes) {
      if (!order.has(node)) {
        search(this, node);
      }
    }

    for (const c of components) {
      this.connect(c, nodeToComponent);
    }

    return {
      components,
      nodeToComponent: nodeToComponent,
    };
  }
}
