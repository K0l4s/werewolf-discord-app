export function weightedRandom(list) {
    const totalWeight = list.reduce((sum, item) => sum + item.weight, 0);
    let rnd = Math.random() * totalWeight;

    for (const item of list) {
        if (rnd < item.weight) return item.label;
        rnd -= item.weight;
    }
    return list[0].label; // fallback
}