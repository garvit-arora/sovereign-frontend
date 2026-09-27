export type ExampleModel = {
  id: string
  title: string
  kind: 'LP' | 'MILP' | 'QP'
  format: 'json' | 'mps'
  description: string
  model: string
}

type Var = { name: string; type: 'continuous' | 'integer' | 'binary'; lower_bound: number; upper_bound: number }
type Row = { name: string; linear: Record<string, number>; sense: '<=' | '>=' | '='; rhs: number }

const INF = 1e30
const continuous = (name: string, upper = INF): Var => ({ name, type: 'continuous', lower_bound: 0, upper_bound: upper })
const integer = (name: string, upper: number): Var => ({ name, type: 'integer', lower_bound: 0, upper_bound: upper })
const binary = (name: string): Var => ({ name, type: 'binary', lower_bound: 0, upper_bound: 1 })
const row = (name: string, linear: Record<string, number>, sense: Row['sense'], rhs: number): Row => ({ name, linear, sense, rhs })
const pretty = (model: unknown) => JSON.stringify(model, null, 2)

function productMix() {
  return pretty({
    problem_type: 'LP',
    sense: 'maximize',
    variables: ['tables', 'chairs', 'desks', 'shelves'].map(name => continuous(name)),
    objective: { linear: { tables: 70, chairs: 30, desks: 90, shelves: 45 } },
    constraints: [
      row('carpentry_hours', { tables: 4, chairs: 2, desks: 5, shelves: 3 }, '<=', 480),
      row('finishing_hours', { tables: 2, chairs: 1, desks: 3, shelves: 2 }, '<=', 240),
      row('timber_board_ft', { tables: 30, chairs: 10, desks: 40, shelves: 20 }, '<=', 3200),
      row('chair_demand', { chairs: 1 }, '<=', 120),
      row('chairs_per_table', { chairs: 1, tables: -4 }, '<=', 0),
    ],
  })
}

function diet() {
  const foods = {
    oats: { cost: 0.3, calories: 150, protein: 5, fibre: 4, fat: 3, max: 4 },
    milk: { cost: 0.25, calories: 120, protein: 8, fibre: 0, fat: 5, max: 4 },
    eggs: { cost: 0.2, calories: 70, protein: 6, fibre: 0, fat: 5, max: 4 },
    bread: { cost: 0.15, calories: 80, protein: 3, fibre: 2, fat: 1, max: 8 },
    beans: { cost: 0.4, calories: 230, protein: 15, fibre: 13, fat: 1, max: 3 },
    chicken: { cost: 1.2, calories: 165, protein: 31, fibre: 0, fat: 4, max: 3 },
  }
  const names = Object.keys(foods) as Array<keyof typeof foods>
  const column = (key: 'calories' | 'protein' | 'fibre' | 'fat') => Object.fromEntries(names.map(n => [n, foods[n][key]]))
  return pretty({
    problem_type: 'LP',
    sense: 'minimize',
    variables: names.map(n => continuous(n, foods[n].max)),
    objective: { linear: Object.fromEntries(names.map(n => [n, foods[n].cost])) },
    constraints: [
      row('calories_min', column('calories'), '>=', 2000),
      row('calories_max', column('calories'), '<=', 2600),
      row('protein_min_g', column('protein'), '>=', 90),
      row('fibre_min_g', column('fibre'), '>=', 30),
      row('fat_max_g', column('fat'), '<=', 65),
    ],
  })
}

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

function facilityLocation() {
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

function projectSelection() {
  const projects = {
    warehouse_automation: { npv: 180, y1: 90, y2: 30 },
    erp_upgrade: { npv: 140, y1: 60, y2: 50 },
    rooftop_solar: { npv: 120, y1: 80, y2: 10 },
    fleet_electrification: { npv: 90, y1: 40, y2: 40 },
    demand_forecasting: { npv: 75, y1: 20, y2: 30 },
    second_production_line: { npv: 210, y1: 110, y2: 60 },
    packaging_redesign: { npv: 60, y1: 25, y2: 15 },
    staff_training: { npv: 40, y1: 10, y2: 20 },
  }
  const names = Object.keys(projects) as Array<keyof typeof projects>
  return pretty({
    problem_type: 'MILP',
    sense: 'maximize',
    variables: names.map(binary),
    objective: { linear: Object.fromEntries(names.map(n => [n, projects[n].npv])) },
    constraints: [
      row('capital_year_1', Object.fromEntries(names.map(n => [n, projects[n].y1])), '<=', 250),
      row('capital_year_2', Object.fromEntries(names.map(n => [n, projects[n].y2])), '<=', 130),
      row('forecasting_needs_erp', { demand_forecasting: 1, erp_upgrade: -1 }, '<=', 0),
      row('one_project_on_roof_site', { rooftop_solar: 1, second_production_line: 1 }, '<=', 1),
    ],
  })
}

function shiftScheduling() {
  const periods = ['00_04', '04_08', '08_12', '12_16', '16_20', '20_24']
  const required = [8, 12, 20, 18, 14, 10]
  const start = (p: string) => `start_${p}`
  return pretty({
    problem_type: 'MILP',
    sense: 'minimize',
    variables: periods.map(p => integer(start(p), 50)),
    objective: { linear: Object.fromEntries(periods.map(p => [start(p), 1])) },
    constraints: periods.map((p, i) => {
      const previous = periods[(i + periods.length - 1) % periods.length]
      return row(`cover_${p}`, { [start(previous)]: 1, [start(p)]: 1 }, '>=', required[i])
    }),
  })
}

function portfolio() {
  const assets = ['us_equity', 'intl_equity', 'bonds', 'real_estate']
  const expected = { us_equity: 0.10, intl_equity: 0.12, bonds: 0.04, real_estate: 0.08 }
  const variance = { us_equity: 0.04, intl_equity: 0.0625, bonds: 0.0036, real_estate: 0.0324 }
  return pretty({
    problem_type: 'QP',
    sense: 'minimize',
    variables: assets.map(a => continuous(a, 0.6)),
    objective: { quadratic: Object.fromEntries(assets.map(a => [a, { [a]: 2 * variance[a as keyof typeof variance] }])) },
    constraints: [
      row('fully_invested', Object.fromEntries(assets.map(a => [a, 1])), '=', 1),
      row('target_return', expected, '>=', 0.08),
    ],
  })
}

// Sum of squared errors for y = slope * (x - 2) + level. Centring x at its mean removes the
// slope-level cross term, so the Hessian is diagonal.
function leastSquaresFit() {
  const points = [[0, 1.1], [1, 2.9], [2, 5.2], [3, 7.1], [4, 8.8]].map(([x, y]) => [x - 2, y])
  const sum = (f: (p: number[]) => number) => points.reduce((s, p) => s + f(p), 0)
  return pretty({
    problem_type: 'QP',
    sense: 'minimize',
    variables: [continuous('slope', 100), continuous('level_at_x2', 100)],
    objective: {
      constant: Number(sum(([, y]) => y * y).toFixed(6)),
      linear: {
        slope: Number((-2 * sum(([x, y]) => x * y)).toFixed(6)),
        level_at_x2: Number((-2 * sum(([, y]) => y)).toFixed(6)),
      },
      quadratic: {
        slope: { slope: 2 * sum(([x]) => x * x) },
        level_at_x2: { level_at_x2: 2 * points.length },
      },
    },
    constraints: [row('slope_cap', { slope: 1 }, '<=', 1.9)],
  })
}

const KNAPSACK_MPS = `* Cargo loading: pick crates that fit a 15 t truck, maximise value.
NAME          CARGO
OBJSENSE
    MAX
ROWS
 N  VALUE
 L  WEIGHT
 L  VOLUME
COLUMNS
    MARKER                 'MARKER'                 'INTORG'
    crate_a   VALUE     40   WEIGHT    4
    crate_a   VOLUME    3
    crate_b   VALUE     55   WEIGHT    6
    crate_b   VOLUME    4
    crate_c   VALUE     32   WEIGHT    3
    crate_c   VOLUME    3
    crate_d   VALUE     70   WEIGHT    8
    crate_d   VOLUME    5
    crate_e   VALUE     25   WEIGHT    2
    crate_e   VOLUME    2
    crate_f   VALUE     48   WEIGHT    5
    crate_f   VOLUME    4
    MARKER                 'MARKER'                 'INTEND'
RHS
    RHS       WEIGHT    15   VOLUME    12
BOUNDS
 UP BND       crate_a   1
 UP BND       crate_b   1
 UP BND       crate_c   1
 UP BND       crate_d   1
 UP BND       crate_e   1
 UP BND       crate_f   1
ENDATA
`

export const EXAMPLES: ExampleModel[] = [
  { id: 'product-mix', title: 'Furniture product mix', kind: 'LP', format: 'json', description: 'Choose weekly output of four products under carpentry, finishing and timber limits to maximise profit.', model: productMix() },
  { id: 'diet', title: 'Minimum-cost diet', kind: 'LP', format: 'json', description: 'Pick daily servings of six foods that meet calorie, protein, fibre and fat targets at the lowest cost.', model: diet() },
  { id: 'transportation', title: 'Plant-to-city shipping', kind: 'LP', format: 'json', description: 'Ship from three plants to four cities, meeting demand within supply at the lowest freight cost.', model: transportation() },
  { id: 'facility-location', title: 'Warehouse location', kind: 'MILP', format: 'json', description: 'Decide which of three warehouses to open and how to serve four stores, trading fixed cost against shipping.', model: facilityLocation() },
  { id: 'project-selection', title: 'Capital project selection', kind: 'MILP', format: 'json', description: 'Fund the set of projects with the highest NPV within two years of capital, with a dependency and a site conflict.', model: projectSelection() },
  { id: 'shift-scheduling', title: 'Nurse shift scheduling', kind: 'MILP', format: 'json', description: 'Staff six 4-hour periods with 8-hour shifts, covering demand with the fewest people.', model: shiftScheduling() },
  { id: 'portfolio', title: 'Minimum-variance portfolio', kind: 'QP', format: 'json', description: 'Allocate across four asset classes to hit an 8% expected return with the lowest variance (uncorrelated returns).', model: portfolio() },
  { id: 'least-squares', title: 'Constrained line fit', kind: 'QP', format: 'json', description: 'Least-squares line through five points with the slope capped at 1.9 (the unconstrained fit is 1.96), so the cap binds. Objective is the sum of squared errors.', model: leastSquaresFit() },
  { id: 'cargo-mps', title: 'Cargo loading (MPS)', kind: 'MILP', format: 'mps', description: 'Binary knapsack in MPS format: choose crates within weight and volume limits for the highest value.', model: KNAPSACK_MPS },
]
