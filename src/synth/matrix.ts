import { clamp } from "./utils.js";

export type ModSource = "env1" | "lfo1" | "velocity" | "random1";
export type ModTarget =
  | "osc.unisonVoices"
  | "osc.unisonDetuneCents"
  | "osc.level"
  | "amp.level";

export interface ModRoute {
  source: ModSource;
  target: ModTarget;
  amount: number;
  bipolar: boolean;
}

const normalizeRoute = (route: ModRoute): ModRoute => {
  return {
    ...route,
    amount: clamp(route.amount, -1, 1),
  };
};

export class ModMatrix {
  private routes: ModRoute[];

  constructor(routes: readonly ModRoute[] = []) {
    this.routes = routes.map((route) => normalizeRoute(route));
  }

  setRoutes(routes: readonly ModRoute[]): void {
    this.routes = routes.map((route) => normalizeRoute(route));
  }

  getRoutes(): readonly ModRoute[] {
    return this.routes;
  }
}
