// TODO: make this not shit

export type ProfilerState = {
    t0: number;
    timings: Map<string, number>;
};

export function newProfilerState(): ProfilerState {
    return {
        t0: 0,
        timings: new Map(),
    };
}

export function profileBegin(p: ProfilerState) {
    p.t0 = performance.now();
}

export function profileIncrementTimer(p: ProfilerState, name: string) {
    const t1 = performance.now();
    const delta = t1 - p.t0;
    const existing = p.timings.get(name) ?? 0;
    p.timings.set(name, existing + delta);
    p.t0 = t1;
}

export function profileEnd(p: ProfilerState) {
    const lines = [
        "Profiling results: \n"
    ];

    for (const [k, v] of p.timings) {
        lines.push(k + ": " + v + "ms\n");
    }

    console.log(lines.join(""));

    p.timings.clear();

}
