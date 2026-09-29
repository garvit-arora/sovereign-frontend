export type ExampleGroup = 'industrial' | 'benchmark' | 'robustness'

export type ExampleModel = {
  id: string
  title: string
  kind: 'LP' | 'MILP' | 'QP'
  group: ExampleGroup
  format: 'json' | 'mps'
  description: string
  model: string
}

export const EXAMPLE_GROUPS: Record<ExampleGroup, string> = {
  industrial: 'Industrial models',
  benchmark: 'Standard benchmarks (Netlib, MIPLIB)',
  robustness: 'Robustness: degeneracy, ill-conditioning, weak relaxations',
}

type Var = { name: string; type: 'continuous' | 'integer' | 'binary'; lower_bound: number; upper_bound: number }
type Row = { name: string; linear: Record<string, number>; sense: '<=' | '>=' | '='; rhs: number }

const INF = 1e30
const continuous = (name: string, upper = INF, lower = 0): Var => ({ name, type: 'continuous', lower_bound: lower, upper_bound: upper })
const binary = (name: string): Var => ({ name, type: 'binary', lower_bound: 0, upper_bound: 1 })
const row = (name: string, linear: Record<string, number>, sense: Row['sense'], rhs: number): Row => ({ name, linear, sense, rhs })
const pretty = (model: unknown) => JSON.stringify(model, null, 2)
const round = (value: number, digits = 6) => Number(value.toFixed(digits))

// Volumes in thousand barrels per day (kb/d), prices in $/bbl, so costs are $k per day.
// Sulfur and API gravity are blended linearly by volume, a standard planning simplification.
function crudeBlending() {
  const crudes = {
    bombay_high: { api: 39, sulfur: 0.17, price: 84, available: 40 },
    murban: { api: 40, sulfur: 0.8, price: 86, available: 50 },
    arab_light: { api: 33, sulfur: 1.9, price: 80, available: 60 },
    urals: { api: 31, sulfur: 1.7, price: 76, available: 40 },
    basrah_medium: { api: 29, sulfur: 2.9, price: 74, available: 70 },
  }
  const names = Object.keys(crudes) as Array<keyof typeof crudes>
  const each = (f: (c: (typeof crudes)[keyof typeof crudes]) => number) => Object.fromEntries(names.map(n => [n, round(f(crudes[n]))]))
  return pretty({
    problem_type: 'LP',
    sense: 'minimize',
    variables: names.map(n => continuous(n, crudes[n].available)),
    objective: { linear: each(c => c.price) },
    constraints: [
      row('crude_unit_feed_kbd', each(() => 1), '=', 120),
      row('sulfur_max_1_2_pct', each(c => c.sulfur - 1.2), '<=', 0),
      row('api_min_32', each(c => c.api - 32), '>=', 0),
      row('api_max_36', each(c => c.api - 36), '<=', 0),
    ],
  })
}

// One crude unit, a fluid catalytic cracker and a naphtha reformer. Yields are volume fractions;
// products may be sold up to the listed demand, and anything not sold is burned as refinery fuel.
function refineryPlanning() {
  const light = { lpg: 0.04, naphtha: 0.25, kerosene: 0.15, diesel: 0.3, vgo: 0.2, residue: 0.06 }
  const heavy = { lpg: 0.02, naphtha: 0.15, kerosene: 0.1, diesel: 0.25, vgo: 0.28, residue: 0.2 }
  return pretty({
    problem_type: 'LP',
    sense: 'maximize',
    variables: [
      continuous('crude_light', 100), continuous('crude_heavy'),
      continuous('naphtha_to_reformer', 35), continuous('naphtha_sold', 20),
      continuous('vgo_to_fcc', 40), continuous('vgo_to_fuel_oil'),
      continuous('lpg_sold', 12), continuous('petrol_sold', 45), continuous('jet_sold', 25),
      continuous('diesel_sold', 60), continuous('fuel_oil_sold', 30),
    ],
    objective: {
      linear: {
        crude_light: -81.5, crude_heavy: -73.5, naphtha_to_reformer: -2.5, vgo_to_fcc: -3,
        naphtha_sold: 70, lpg_sold: 55, petrol_sold: 98, jet_sold: 96, diesel_sold: 95, fuel_oil_sold: 60,
      },
    },
    constraints: [
      row('crude_unit_capacity', { crude_light: 1, crude_heavy: 1 }, '<=', 150),
      row('naphtha_balance', { crude_light: light.naphtha, crude_heavy: heavy.naphtha, naphtha_to_reformer: -1, naphtha_sold: -1 }, '=', 0),
      row('vgo_balance', { crude_light: light.vgo, crude_heavy: heavy.vgo, vgo_to_fcc: -1, vgo_to_fuel_oil: -1 }, '=', 0),
      row('lpg_available', { lpg_sold: 1, crude_light: -light.lpg, crude_heavy: -heavy.lpg, naphtha_to_reformer: -0.1, vgo_to_fcc: -0.15 }, '<=', 0),
      row('petrol_available', { petrol_sold: 1, naphtha_to_reformer: -0.85, vgo_to_fcc: -0.55 }, '<=', 0),
      row('jet_available', { jet_sold: 1, crude_light: -light.kerosene, crude_heavy: -heavy.kerosene }, '<=', 0),
      row('diesel_available', { diesel_sold: 1, crude_light: -light.diesel, crude_heavy: -heavy.diesel, vgo_to_fcc: -0.2 }, '<=', 0),
      row('fuel_oil_available', { fuel_oil_sold: 1, crude_light: -light.residue, crude_heavy: -heavy.residue, vgo_to_fcc: -0.1, vgo_to_fuel_oil: -1 }, '<=', 0),
      row('diesel_contract_min', { diesel_sold: 1 }, '>=', 40),
    ],
  })
}

// Thousand tonnes per quarter. Urea uses 1.0 and DAP 1.4 units of shared granulation capacity.
function productionPlanning() {
  const quarters = ['q1', 'q2', 'q3', 'q4']
  const products = {
    urea: { demand: [300, 450, 250, 500], cost: 10, hold: 0.8, capacity: 1.0 },
    dap: { demand: [150, 250, 120, 280], cost: 18, hold: 1.2, capacity: 1.4 },
  }
  const names = Object.keys(products) as Array<keyof typeof products>
  const make = (p: string, q: string) => `make_${p}_${q}`
  const stock = (p: string, q: string) => `stock_${p}_${q}`
  return pretty({
    problem_type: 'LP',
    sense: 'minimize',
    variables: [
      ...names.flatMap(p => quarters.map(q => continuous(make(p, q)))),
      ...names.flatMap(p => quarters.map(q => continuous(stock(p, q)))),
      ...quarters.map(q => continuous(`overtime_${q}`, 120)),
    ],
    objective: {
      linear: {
        ...Object.fromEntries(names.flatMap(p => quarters.map(q => [make(p, q), products[p].cost]))),
        ...Object.fromEntries(names.flatMap(p => quarters.map(q => [stock(p, q), products[p].hold]))),
        ...Object.fromEntries(quarters.map(q => [`overtime_${q}`, 5])),
      },
    },
    constraints: [
      ...names.flatMap(p => quarters.map((q, i) => row(`balance_${p}_${q}`, {
        [make(p, q)]: 1, [stock(p, q)]: -1, ...(i > 0 ? { [stock(p, quarters[i - 1])]: 1 } : {}),
      }, '=', products[p].demand[i]))),
      ...quarters.map(q => row(`capacity_${q}`, {
        ...Object.fromEntries(names.map(p => [make(p, q), products[p].capacity])), [`overtime_${q}`]: -1,
      }, '<=', 600)),
      ...names.map(p => row(`closing_stock_${p}`, { [stock(p, 'q4')]: 1 }, '>=', 50)),
    ],
  })
}

// Seeded so every visitor loads the same model and the stated optimum stays true.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Each product draws on six of the plant's shared resources (line hours, raw materials, utilities,
// labour shifts), in units per tonne. Synthetic data: sized like a multi-plant weekly plan.
function plantProductMix() {
  const products = 2200
  const resources = 1500
  const perProduct = 6
  const rand = mulberry32(26119)
  const uniform = (lo: number, hi: number, digits: number) => round(lo + (hi - lo) * rand(), digits)
  const product = (j: number) => `product_${String(j + 1).padStart(4, '0')}`
  const usage: Array<Record<string, number>> = Array.from({ length: resources }, () => ({}))
  for (let j = 0; j < products; j++) {
    const picked = new Set<number>()
    while (picked.size < perProduct) picked.add(Math.floor(rand() * resources))
    for (const i of picked) usage[i][product(j)] = uniform(0.5, 3, 3)
  }
  return JSON.stringify({
    problem_type: 'LP',
    sense: 'maximize',
    variables: Array.from({ length: products }, (_, j) => continuous(product(j))),
    objective: { linear: Object.fromEntries(Array.from({ length: products }, (_, j) => [product(j), uniform(1, 10, 3)])) },
    constraints: usage.map((linear, i) => row(`resource_${String(i + 1).padStart(4, '0')}`, linear, '<=', uniform(50, 150, 2))),
  })
}
let plantProductMixModel: string | undefined

function transportation() {
  const supply = { plant_north: 300, plant_central: 400, plant_south: 250 }
  const demand = { city_a: 200, city_b: 250, city_c: 225, city_d: 175 }
  const cost: Record<string, number[]> = {
    plant_north: [4, 6, 9, 5],
    plant_central: [5, 3, 4, 7],
    plant_south: [8, 5, 3, 7],
  }
  const plants = Object.keys(supply) as Array<keyof typeof supply>
  const cities = Object.keys(demand) as Array<keyof typeof demand>
  const arc = (p: string, c: string) => `${p}__${c}`
  return pretty({
    problem_type: 'LP',
    sense: 'minimize',
    variables: plants.flatMap(p => cities.map(c => continuous(arc(p, c)))),
    objective: { linear: Object.fromEntries(plants.flatMap(p => cities.map((c, j) => [arc(p, c), cost[p][j]]))) },
    constraints: [
      ...plants.map(p => row(`supply_${p}`, Object.fromEntries(cities.map(c => [arc(p, c), 1])), '<=', supply[p])),
      ...cities.map(c => row(`demand_${c}`, Object.fromEntries(plants.map(p => [arc(p, c), 1])), '>=', demand[c])),
    ],
  })
}

function networkDesign() {
  const sites = { wh_east: { fixed: 12000, capacity: 500 }, wh_central: { fixed: 9000, capacity: 350 }, wh_west: { fixed: 15000, capacity: 700 } }
  const customers = { store_1: 180, store_2: 220, store_3: 150, store_4: 260 }
  const unit: Record<string, number[]> = { wh_east: [8, 12, 15, 10], wh_central: [14, 7, 9, 13], wh_west: [11, 10, 6, 7] }
  const names = Object.keys(sites) as Array<keyof typeof sites>
  const stores = Object.keys(customers) as Array<keyof typeof customers>
  const ship = (w: string, s: string) => `ship_${w}__${s}`
  return pretty({
    problem_type: 'MILP',
    sense: 'minimize',
    variables: [
      ...names.map(w => binary(`open_${w}`)),
      ...names.flatMap(w => stores.map(s => continuous(ship(w, s)))),
    ],
    objective: {
      linear: {
        ...Object.fromEntries(names.map(w => [`open_${w}`, sites[w].fixed])),
        ...Object.fromEntries(names.flatMap(w => stores.map((s, j) => [ship(w, s), unit[w][j]]))),
      },
    },
    constraints: [
      ...stores.map(s => row(`serve_${s}`, Object.fromEntries(names.map(w => [ship(w, s), 1])), '=', customers[s])),
      ...names.map(w => row(`capacity_${w}`, { ...Object.fromEntries(stores.map(s => [ship(w, s), 1])), [`open_${w}`]: -sites[w].capacity }, '<=', 0)),
    ],
  })
}

// Wood & Wollenberg, Power Generation, Operation and Control, Example 3A: fuel cost
// F(P) = a + bP + cP^2 in $/h. The objective is 0.5 P'QP + b'P + sum(a), so Q = 2c.
function economicDispatch() {
  const units = {
    unit_1: { a: 561, b: 7.92, c: 0.001562, min: 150, max: 600 },
    unit_2: { a: 310, b: 7.85, c: 0.00194, min: 100, max: 400 },
    unit_3: { a: 78, b: 7.97, c: 0.00482, min: 50, max: 200 },
  }
  const names = Object.keys(units) as Array<keyof typeof units>
  return pretty({
    problem_type: 'QP',
    sense: 'minimize',
    variables: names.map(n => continuous(n, units[n].max, units[n].min)),
    objective: {
      constant: names.reduce((s, n) => s + units[n].a, 0),
      linear: Object.fromEntries(names.map(n => [n, units[n].b])),
      quadratic: Object.fromEntries(names.map(n => [n, { [n]: round(2 * units[n].c, 8) }])),
    },
    constraints: [row('demand_mw', Object.fromEntries(names.map(n => [n, 1])), '=', 850)],
  })
}

// Six 4-hour blocks. Each block costs 4 h x (marginal cost x output + no-load cost when on),
// plus a start-up cost. Committed capacity must cover demand plus a 10% spinning reserve.
function unitCommitment() {
  const units = {
    coal: { min: 150, max: 450, marginal: 20, noLoad: 400, startUp: 3000, initiallyOn: 1 },
    ccgt: { min: 80, max: 300, marginal: 32, noLoad: 250, startUp: 800, initiallyOn: 0 },
    gas_peaker: { min: 20, max: 120, marginal: 55, noLoad: 80, startUp: 150, initiallyOn: 0 },
  }
  const demand = [300, 280, 480, 620, 700, 450]
  const names = Object.keys(units) as Array<keyof typeof units>
  const blocks = demand.map((_, t) => `t${t + 1}`)
  const v = (kind: string, u: string, t: string) => `${kind}_${u}_${t}`
  return pretty({
    problem_type: 'MILP',
    sense: 'minimize',
    variables: names.flatMap(u => blocks.flatMap(t => [
      binary(v('on', u, t)), binary(v('start', u, t)), continuous(v('mw', u, t), units[u].max),
    ])),
    objective: {
      linear: Object.fromEntries(names.flatMap(u => blocks.flatMap(t => [
        [v('mw', u, t), 4 * units[u].marginal], [v('on', u, t), 4 * units[u].noLoad], [v('start', u, t), units[u].startUp],
      ]))),
    },
    constraints: [
      ...blocks.map((t, i) => row(`demand_${t}`, Object.fromEntries(names.map(u => [v('mw', u, t), 1])), '=', demand[i])),
      ...blocks.map((t, i) => row(`reserve_${t}`, Object.fromEntries(names.map(u => [v('on', u, t), units[u].max])), '>=', round(1.1 * demand[i]))),
      ...names.flatMap(u => blocks.flatMap(t => [
        row(`min_output_${u}_${t}`, { [v('mw', u, t)]: 1, [v('on', u, t)]: -units[u].min }, '>=', 0),
        row(`max_output_${u}_${t}`, { [v('mw', u, t)]: 1, [v('on', u, t)]: -units[u].max }, '<=', 0),
      ])),
      ...names.flatMap(u => blocks.map((t, i) => row(`start_up_${u}_${t}`,
        i === 0 ? { [v('start', u, t)]: 1, [v('on', u, t)]: -1 } : { [v('start', u, t)]: 1, [v('on', u, t)]: -1, [v('on', u, blocks[i - 1])]: 1 },
        '>=', i === 0 ? -units[u].initiallyOn : 0))),
    ],
  })
}

// BS-VI diesel: sulfur at most 10 ppm, cetane at least 51, density 815 to 845 kg/m3. The quadratic
// term penalises cetane give-away above the 52 target, (cetane - 52)^2 in $k per day.
function dieselBlending() {
  const components = {
    hydrotreated_gasoil: { cetane: 54, density: 842, sulfur: 8, price: 92, available: 70 },
    hydrocracker_diesel: { cetane: 60, density: 825, sulfur: 3, price: 97, available: 40 },
    kerosene: { cetane: 45, density: 800, sulfur: 5, price: 90, available: 30 },
    hydrotreated_lco: { cetane: 35, density: 880, sulfur: 9, price: 80, available: 30 },
    biodiesel_fame: { cetane: 56, density: 880, sulfur: 1, price: 105, available: 7 },
  }
  const names = Object.keys(components) as Array<keyof typeof components>
  const volume = 100
  const each = (f: (c: (typeof components)[keyof typeof components]) => number) => Object.fromEntries(names.map(n => [n, round(f(components[n]))]))
  // Blend cetane = a'x with a = cetane / volume; (a'x - 52)^2 = x'(aa')x - 104 a'x + 2704.
  const a = Object.fromEntries(names.map(n => [n, components[n].cetane / volume]))
  return pretty({
    problem_type: 'QP',
    sense: 'minimize',
    variables: names.map(n => continuous(n, components[n].available)),
    objective: {
      constant: 52 * 52,
      linear: Object.fromEntries(names.map(n => [n, round(components[n].price - 104 * a[n])])),
      quadratic: Object.fromEntries(names.map(i => [i, Object.fromEntries(names.map(j => [j, round(2 * a[i] * a[j], 8)]))])),
    },
    constraints: [
      row('blend_volume_kbd', each(() => 1), '=', volume),
      row('sulfur_max_10_ppm', each(c => c.sulfur - 10), '<=', 0),
      row('cetane_min_51', each(c => c.cetane - 51), '>=', 0),
      row('density_min_815', each(c => c.density - 815), '>=', 0),
      row('density_max_845', each(c => c.density - 845), '<=', 0),
    ],
  })
}

// Every vertex of the assignment polytope has n positive values among 2n - 1 basic variables,
// so the LP is massively degenerate. Costs are fixed pseudo-random minutes of deadhead travel.
function assignment() {
  const n = 12
  const crews = Array.from({ length: n }, (_, i) => `crew_${String(i + 1).padStart(2, '0')}`)
  const routes = Array.from({ length: n }, (_, j) => `route_${String(j + 1).padStart(2, '0')}`)
  const cost = (i: number, j: number) => 10 + ((i * 37 + j * 91 + i * j * 13) % 83)
  const x = (i: number, j: number) => `${crews[i]}__${routes[j]}`
  return pretty({
    problem_type: 'LP',
    sense: 'minimize',
    variables: crews.flatMap((_, i) => routes.map((_, j) => continuous(x(i, j)))),
    objective: { linear: Object.fromEntries(crews.flatMap((_, i) => routes.map((_, j) => [x(i, j), cost(i, j)]))) },
    constraints: [
      ...crews.map((c, i) => row(`one_route_${c}`, Object.fromEntries(routes.map((_, j) => [x(i, j), 1])), '=', 1)),
      ...routes.map((r, j) => row(`one_crew_${r}`, Object.fromEntries(crews.map((_, i) => [x(i, j), 1])), '=', 1)),
    ],
  })
}

// Beale (1955): the textbook LP on which the simplex method with Dantzig's rule cycles forever.
function bealeCycling() {
  return pretty({
    problem_type: 'LP',
    sense: 'minimize',
    variables: ['x1', 'x2', 'x3', 'x4'].map(n => continuous(n)),
    objective: { linear: { x1: -0.75, x2: 20, x3: -0.5, x4: 6 } },
    constraints: [
      row('r1', { x1: 0.25, x2: -8, x3: -1, x4: 9 }, '<=', 0),
      row('r2', { x1: 0.5, x2: -12, x3: -0.5, x4: 3 }, '<=', 0),
      row('r3', { x3: 1 }, '<=', 1),
    ],
  })
}

// Hilbert matrix H[i][j] = 1 / (i + j + 1), condition number about 1.5e7 at n = 6. With b = H·1
// the only feasible point is x = 1, so the objective must come back as exactly n.
function hilbertSystem() {
  const n = 6
  const names = Array.from({ length: n }, (_, j) => `x${j + 1}`)
  const h = (i: number, j: number) => 1 / (i + j + 1)
  return pretty({
    problem_type: 'LP',
    sense: 'minimize',
    variables: names.map(name => continuous(name, 10)),
    objective: { linear: Object.fromEntries(names.map(name => [name, 1])) },
    constraints: names.map((_, i) => row(`hilbert_row_${i + 1}`, Object.fromEntries(names.map((name, j) => [name, h(i, j)])),
      '=', names.reduce((s, _, j) => s + h(i, j), 0))),
  })
}

// Uncapacitated lot sizing with a big-M setup link x_t <= M y_t. With M = 10,000 the LP
// relaxation opens each setup at y_t = x_t / M, so its bound is far below the integer optimum.
function weakLotSizing() {
  const demand = [40, 0, 60, 30, 0, 80, 50, 20]
  const bigM = 10000
  const periods = demand.map((_, t) => `p${t + 1}`)
  return pretty({
    problem_type: 'MILP',
    sense: 'minimize',
    variables: [
      ...periods.map(p => continuous(`make_${p}`)),
      ...periods.map(p => continuous(`stock_${p}`)),
      ...periods.map(p => binary(`setup_${p}`)),
    ],
    objective: {
      linear: {
        ...Object.fromEntries(periods.map(p => [`setup_${p}`, 500])),
        ...Object.fromEntries(periods.map(p => [`stock_${p}`, 4])),
      },
    },
    constraints: [
      ...periods.map((p, t) => row(`balance_${p}`, {
        [`make_${p}`]: 1, [`stock_${p}`]: -1, ...(t > 0 ? { [`stock_${periods[t - 1]}`]: 1 } : {}),
      }, '=', demand[t])),
      ...periods.map(p => row(`setup_link_${p}`, { [`make_${p}`]: 1, [`setup_${p}`]: -bigM }, '<=', 0)),
    ],
  })
}

// Netlib AFIRO, unmodified (https://www.netlib.org/lp/data/afiro).
const AFIRO_MPS = `NAME          AFIRO
ROWS
 E  R09
 E  R10
 L  X05
 L  X21
 E  R12
 E  R13
 L  X17
 L  X18
 L  X19
 L  X20
 E  R19
 E  R20
 L  X27
 L  X44
 E  R22
 E  R23
 L  X40
 L  X41
 L  X42
 L  X43
 L  X45
 L  X46
 L  X47
 L  X48
 L  X49
 L  X50
 L  X51
 N  COST
COLUMNS
    X01       X48               .301   R09                -1.
    X01       R10              -1.06   X05                 1.
    X02       X21                -1.   R09                 1.
    X02       COST               -.4
    X03       X46                -1.   R09                 1.
    X04       X50                 1.   R10                 1.
    X06       X49               .301   R12                -1.
    X06       R13              -1.06   X17                 1.
    X07       X49               .313   R12                -1.
    X07       R13              -1.06   X18                 1.
    X08       X49               .313   R12                -1.
    X08       R13               -.96   X19                 1.
    X09       X49               .326   R12                -1.
    X09       R13               -.86   X20                 1.
    X10       X45              2.364   X17                -1.
    X11       X45              2.386   X18                -1.
    X12       X45              2.408   X19                -1.
    X13       X45              2.429   X20                -1.
    X14       X21                1.4   R12                 1.
    X14       COST              -.32
    X15       X47                -1.   R12                 1.
    X16       X51                 1.   R13                 1.
    X22       X46               .109   R19                -1.
    X22       R20               -.43   X27                 1.
    X23       X44                -1.   R19                 1.
    X23       COST               -.6
    X24       X48                -1.   R19                 1.
    X25       X45                -1.   R19                 1.
    X26       X50                 1.   R20                 1.
    X28       X47               .109   R22               -.43
    X28       R23                 1.   X40                 1.
    X29       X47               .108   R22               -.43
    X29       R23                 1.   X41                 1.
    X30       X47               .108   R22               -.39
    X30       R23                 1.   X42                 1.
    X31       X47               .107   R22               -.37
    X31       R23                 1.   X43                 1.
    X32       X45              2.191   X40                -1.
    X33       X45              2.219   X41                -1.
    X34       X45              2.249   X42                -1.
    X35       X45              2.279   X43                -1.
    X36       X44                1.4   R23                -1.
    X36       COST              -.48
    X37       X49                -1.   R23                 1.
    X38       X51                 1.   R22                 1.
    X39       R23                 1.   COST                10.
RHS
    B         X50               310.   X51               300.
    B         X05                80.   X17                80.
    B         X27               500.   R23                44.
    B         X40               500.
ENDATA
`

// MIPLIB flugpl, unmodified (https://miplib2010.zib.de/miplib3/miplib.html).
const FLUGPL_MPS = `*NAME:         flugpl
*ROWS:         18
*COLUMNS:      18
*INTEGER:      11
*NONZERO:      46
*BEST SOLN:    1201500 (opt)
*LP SOLN:      1167185.73
*SOURCE:       Harvey M. Wagner
*              John W. Gregory (Cray Research)
*              E. Andrew Boyd (Rice University)
*APPLICATION:  airline model
*COMMENTS:     no integer variables are binary
NAME          flugpl
ROWS
 N  KOSTEN
 E  ANZ1
 G  STD1
 L  UEB1
 E  ANZ2
 G  STD2
 L  UEB2
 E  ANZ3
 G  STD3
 L  UEB3
 E  ANZ4
 G  STD4
 L  UEB4
 E  ANZ5
 G  STD5
 L  UEB5
 E  ANZ6
 G  STD6
 L  UEB6
COLUMNS
    STM1      KOSTEN            2700   ANZ1                 1
    STM1      STD1               150   UEB1               -20
    STM1      ANZ2               0.9
    MARK0000  'MARKER'                 'INTORG'
    ANM1      KOSTEN            1500   STD1              -100
    ANM1      ANZ2                 1
    MARK0001  'MARKER'                 'INTEND'
    UE1       KOSTEN              30   STD1                 1
    UE1       UEB1                 1
    MARK0002  'MARKER'                 'INTORG'
    STM2      KOSTEN            2700   ANZ2                -1
    STM2      STD2               150   UEB2               -20
    STM2      ANZ3               0.9
    ANM2      KOSTEN            1500   STD2              -100
    ANM2      ANZ3                 1
    MARK0003  'MARKER'                 'INTEND'
    UE2       KOSTEN              30   STD2                 1
    UE2       UEB2                 1
    MARK0004  'MARKER'                 'INTORG'
    STM3      KOSTEN            2700   ANZ3                -1
    STM3      STD3               150   UEB3               -20
    STM3      ANZ4               0.9
    ANM3      KOSTEN            1500   STD3              -100
    ANM3      ANZ4                 1
    MARK0005  'MARKER'                 'INTEND'
    UE3       KOSTEN              30   STD3                 1
    UE3       UEB3                 1
    MARK0006  'MARKER'                 'INTORG'
    STM4      KOSTEN            2700   ANZ4                -1
    STM4      STD4               150   UEB4               -20
    STM4      ANZ5               0.9
    ANM4      KOSTEN            1500   STD4              -100
    ANM4      ANZ5                 1
    MARK0007  'MARKER'                 'INTEND'
    UE4       KOSTEN              30   STD4                 1
    UE4       UEB4                 1
    MARK0008  'MARKER'                 'INTORG'
    STM5      KOSTEN            2700   ANZ5                -1
    STM5      STD5               150   UEB5               -20
    STM5      ANZ6               0.9
    ANM5      KOSTEN            1500   STD5              -100
    ANM5      ANZ6                 1
    MARK0009  'MARKER'                 'INTEND'
    UE5       KOSTEN              30   STD5                 1
    UE5       UEB5                 1
    MARK0010  'MARKER'                 'INTORG'
    STM6      KOSTEN            2700   ANZ6                -1
    STM6      STD6               150   UEB6               -20
    ANM6      KOSTEN            1500   STD6              -100
    MARK0011  'MARKER'                 'INTEND'
    UE6       KOSTEN              30   STD6                 1
    UE6       UEB6                 1
RHS
    RR        ANZ1                60   STD1              8000
    RR        STD2              9000   STD3              8000
    RR        STD4             10000   STD5              9000
    RR        STD6             12000
BOUNDS
 UP BB        ANM1                18
 LO BB        STM2                57
 UP BB        STM2                75
 UP BB        ANM2                18
 LO BB        STM3                57
 UP BB        STM3                75
 UP BB        ANM3                18
 LO BB        STM4                57
 UP BB        STM4                75
 UP BB        ANM4                18
 LO BB        STM5                57
 UP BB        STM5                75
 UP BB        ANM5                18
 LO BB        STM6                57
 UP BB        STM6                75
 UP BB        ANM6                18
ENDATA
`

export const EXAMPLES: ExampleModel[] = [
  { id: 'crude-blending', title: 'Crude oil blending', kind: 'LP', group: 'industrial', format: 'json', description: 'Choose a 120 kb/d crude slate from five crudes at the lowest cost while keeping the blend within sulfur and API gravity limits. Optimum: 9,627.43 ($k per day).', model: crudeBlending() },
  { id: 'refinery-planning', title: 'Refinery production plan', kind: 'LP', group: 'industrial', format: 'json', description: 'Run a crude unit, catalytic cracker and reformer to maximise daily margin under unit capacities, product demand and a diesel contract. Optimum: 1,307.19 ($k per day).', model: refineryPlanning() },
  { id: 'production-planning', title: 'Seasonal fertiliser production', kind: 'LP', group: 'industrial', format: 'json', description: 'Plan four quarters of urea and DAP output with overtime and inventory to meet kharif and rabi demand at the lowest cost. Optimum: 32,905.6.', model: productionPlanning() },
  { id: 'plant-product-mix', title: 'Multi-plant product mix (large)', kind: 'LP', group: 'industrial', format: 'json', description: 'Set weekly output for 2,200 products that share 1,500 capacity-limited resources (line hours, raw materials, utilities, labour shifts) to maximise contribution. Synthetic data from a fixed seed. Optimum: 89,397.09.', get model() { return (plantProductMixModel ??= plantProductMix()) } },
  { id: 'transportation', title: 'Plant-to-city freight', kind: 'LP', group: 'industrial', format: 'json', description: 'Ship from three plants to four cities, meeting demand within supply at the lowest freight cost. Optimum: 3,175.', model: transportation() },
  { id: 'unit-commitment', title: 'Power unit commitment', kind: 'MILP', group: 'industrial', format: 'json', description: 'Decide which of three generators run in each 4-hour block and at what output, covering demand and a 10% reserve with start-up and no-load costs. Optimum: $269,060 per day.', model: unitCommitment() },
  { id: 'network-design', title: 'Distribution network design', kind: 'MILP', group: 'industrial', format: 'json', description: 'Decide which of three warehouses to open and how to serve four stores, trading fixed cost against shipping. Optimum: 28,030.', model: networkDesign() },
  { id: 'economic-dispatch', title: 'Economic dispatch', kind: 'QP', group: 'industrial', format: 'json', description: 'Share 850 MW between three thermal units with quadratic fuel costs (Wood & Wollenberg, Example 3A). Published answer: 393.2, 334.6 and 122.2 MW at $8,194.36/h.', model: economicDispatch() },
  { id: 'diesel-blending', title: 'BS-VI diesel blending', kind: 'QP', group: 'industrial', format: 'json', description: 'Blend 100 kb/d of diesel within BS-VI sulfur, cetane and density limits at the lowest cost, with a quadratic penalty on cetane give-away. Optimum: 9,038.17.', model: dieselBlending() },
  { id: 'netlib-afiro', title: 'Netlib AFIRO', kind: 'LP', group: 'benchmark', format: 'mps', description: 'The original Netlib LP file. Published optimum: -464.7531428571.', model: AFIRO_MPS },
  { id: 'miplib-flugpl', title: 'MIPLIB flugpl', kind: 'MILP', group: 'benchmark', format: 'mps', description: 'The original MIPLIB airline crew planning file with 11 general integers. Published optimum: 1,201,500 (LP relaxation 1,167,185.73).', model: FLUGPL_MPS },
  { id: 'beale-cycling', title: 'Beale cycling LP (degenerate)', kind: 'LP', group: 'robustness', format: 'json', description: 'The textbook degenerate LP on which the simplex method with Dantzig pricing cycles forever. Optimum: -1.25.', model: bealeCycling() },
  { id: 'assignment', title: 'Crew-to-route assignment (degenerate)', kind: 'LP', group: 'robustness', format: 'json', description: 'A 12 x 12 assignment LP: every basic solution has 12 positive values among 23 basic variables, so almost every pivot is degenerate. Optimum: 191.', model: assignment() },
  { id: 'hilbert', title: 'Hilbert matrix system (ill-conditioned)', kind: 'LP', group: 'robustness', format: 'json', description: 'Equality constraints built from a 6 x 6 Hilbert matrix, condition number about 1.5e7. The only feasible point is x = 1, so the optimum is exactly 6.', model: hilbertSystem() },
  { id: 'weak-lot-sizing', title: 'Big-M lot sizing (weak relaxation)', kind: 'MILP', group: 'robustness', format: 'json', description: 'Eight-period lot sizing with a big-M setup link (M = 10,000). The LP relaxation bound is 14 but the integer optimum is 1,980, so branch-and-cut has to close almost the whole gap.', model: weakLotSizing() },
]
