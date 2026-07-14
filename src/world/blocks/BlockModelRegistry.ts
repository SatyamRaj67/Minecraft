export const enum ModelType {
  INVISIBLE = 0,
  CUBE = 1,
  CROSS = 2,
  SLAB = 3,
  STAIR = 4,
  FENCE = 5,
  WALL = 6,
  PANE = 7,
  DOOR = 8,
  TRAPDOOR = 9,
  TORCH = 10,
  LIQUID = 11,
  CARPET = 12, // Thin (1/16) flat layer on top of block below
  BUTTON = 13,
  LEVER = 14,
  PRESSURE_PLATE = 15,
  SIGN = 16,
  BED = 17,
  CHEST = 18,
}

export interface CubeFaces {
  all?: string; // Shorthand: same texture for all 6 faces
  top?: string;
  bottom?: string;
  north?: string;
  south?: string;
  east?: string;
  west?: string;
  side?: string; // Shorthand: same for all 4 lateral faces
}

export interface BlockModel {
  id: number;
  name: string;
  modelType: ModelType;
  faces: CubeFaces;
  transparent: boolean; // Does not occlude neighbors
  fullCube: boolean; // Occupies a complete 1×1×1 volume
  lightEmission: number; // 0–15
  lightFilter: number; // How much sky/block light this absorbs (0–15)
  collidable: boolean;
  flammable: boolean;
  hardness: number; // Break time multiplier (1.0 = stone)
  /** For CROSS models: which texture to use for both quads */
  crossTexture?: string;
  /** For LIQUID models: still + flow textures */
  liquidStill?: string;
  liquidFlow?: string;
}

// ─── Helper builders ─────────────────────────────────────────────────────────

function cube(
  id: number,
  name: string,
  faces: CubeFaces,
  opts: Partial<BlockModel> = {},
): BlockModel {
  return {
    id,
    name,
    modelType: ModelType.CUBE,
    faces,
    transparent: false,
    fullCube: true,
    lightEmission: 0,
    lightFilter: 15,
    collidable: true,
    flammable: false,
    hardness: 1.0,
    ...opts,
  };
}

function cross(
  id: number,
  name: string,
  texture: string,
  opts: Partial<BlockModel> = {},
): BlockModel {
  return {
    id,
    name,
    modelType: ModelType.CROSS,
    faces: {},
    crossTexture: texture,
    transparent: true,
    fullCube: false,
    lightEmission: 0,
    lightFilter: 0,
    collidable: false,
    flammable: true,
    hardness: 0,
    ...opts,
  };
}

function liquid(
  id: number,
  name: string,
  still: string,
  flow: string,
  opts: Partial<BlockModel> = {},
): BlockModel {
  return {
    id,
    name,
    modelType: ModelType.LIQUID,
    faces: {},
    liquidStill: still,
    liquidFlow: flow,
    transparent: true,
    fullCube: false,
    lightEmission: 0,
    lightFilter: 2,
    collidable: false,
    flammable: false,
    hardness: 100,
    ...opts,
  };
}

// ─── Block Model Registry ─────────────────────────────────────────────────────
// Block ID 0 is always AIR.
// IDs here must match the numeric IDs used in WorldGen.worker.ts and ChunkMesher.

export const BLOCK_MODELS: BlockModel[] = [
  // ── ID 0: Air ──────────────────────────────────────────────────────────────
  {
    id: 0,
    name: "air",
    modelType: ModelType.INVISIBLE,
    faces: {},
    transparent: true,
    fullCube: false,
    lightEmission: 0,
    lightFilter: 0,
    collidable: false,
    flammable: false,
    hardness: 0,
  },

  // ── ID 1: Stone ────────────────────────────────────────────────────────────
  cube(1, "stone", { all: "stone" }, { hardness: 1.5 }),
  cube(2, "dirt", { all: "dirt" }, { hardness: 0.5, flammable: false }),
  cube(
    3,
    "grass",
    {
      top: "grass_block_top",
      bottom: "dirt",
      side: "grass_block_side",
    },
    { hardness: 0.6 },
  ),
  cube(4, "sand", { all: "sand" }, { hardness: 0.5 }),
  cube(5, "gravel", { all: "gravel" }, { hardness: 0.6 }),
  cube(6, "bedrock", { all: "bedrock" }, { hardness: -1, collidable: true }),

  // ── ID 7–14: Wood logs ────────────────────────────────────────────────────
  cube(
    7,
    "oak_log",
    { top: "oak_log_top", side: "oak_log" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    8,
    "spruce_log",
    { top: "spruce_log_top", side: "spruce_log" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    9,
    "birch_log",
    { top: "birch_log_top", side: "birch_log" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    10,
    "jungle_log",
    { top: "jungle_log_top", side: "jungle_log" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    11,
    "acacia_log",
    { top: "acacia_log_top", side: "acacia_log" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    12,
    "dark_oak_log",
    { top: "dark_oak_log_top", side: "dark_oak_log" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    13,
    "crimson_stem",
    { top: "crimson_stem_top", side: "crimson_stem" },
    { hardness: 2 },
  ),
  cube(
    14,
    "warped_stem",
    { top: "warped_stem_top", side: "warped_stem" },
    { hardness: 2 },
  ),

  // ── ID 15–24: Planks ──────────────────────────────────────────────────────
  cube(
    15,
    "oak_planks",
    { all: "oak_planks" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    16,
    "spruce_planks",
    { all: "spruce_planks" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    17,
    "birch_planks",
    { all: "birch_planks" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    18,
    "jungle_planks",
    { all: "jungle_planks" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    19,
    "acacia_planks",
    { all: "acacia_planks" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    20,
    "dark_oak_planks",
    { all: "dark_oak_planks" },
    { flammable: true, hardness: 2 },
  ),
  cube(21, "crimson_planks", { all: "crimson_planks" }, { hardness: 2 }),
  cube(22, "warped_planks", { all: "warped_planks" }, { hardness: 2 }),
  cube(
    23,
    "mangrove_planks",
    { all: "mangrove_planks" },
    { flammable: true, hardness: 2 },
  ),
  cube(
    24,
    "cherry_planks",
    { all: "cherry_planks" },
    { flammable: true, hardness: 2 },
  ),

  // ── ID 25–34: Leaves ──────────────────────────────────────────────────────
  cube(
    25,
    "oak_leaves",
    { all: "oak_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    26,
    "spruce_leaves",
    { all: "spruce_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    27,
    "birch_leaves",
    { all: "birch_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    28,
    "jungle_leaves",
    { all: "jungle_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    29,
    "acacia_leaves",
    { all: "acacia_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    30,
    "dark_oak_leaves",
    { all: "dark_oak_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    31,
    "mangrove_leaves",
    { all: "mangrove_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    32,
    "cherry_leaves",
    { all: "cherry_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),
  cube(
    33,
    "azalea_leaves",
    { all: "azalea_leaves" },
    { transparent: true, lightFilter: 1, flammable: true, hardness: 0.2 },
  ),

  // ── ID 34–43: Ores ────────────────────────────────────────────────────────
  cube(34, "coal_ore", { all: "coal_ore" }, { hardness: 3 }),
  cube(35, "iron_ore", { all: "iron_ore" }, { hardness: 3 }),
  cube(36, "copper_ore", { all: "copper_ore" }, { hardness: 3 }),
  cube(37, "gold_ore", { all: "gold_ore" }, { hardness: 3 }),
  cube(
    38,
    "redstone_ore",
    { all: "redstone_ore" },
    { hardness: 3, lightEmission: 9 },
  ),
  cube(39, "emerald_ore", { all: "emerald_ore" }, { hardness: 3 }),
  cube(40, "lapis_ore", { all: "lapis_ore" }, { hardness: 3 }),
  cube(41, "diamond_ore", { all: "diamond_ore" }, { hardness: 3 }),
  cube(
    42,
    "deepslate_coal_ore",
    { all: "deepslate_coal_ore" },
    { hardness: 4.5 },
  ),
  cube(
    43,
    "deepslate_iron_ore",
    { all: "deepslate_iron_ore" },
    { hardness: 4.5 },
  ),
  cube(
    44,
    "deepslate_diamond_ore",
    { all: "deepslate_diamond_ore" },
    { hardness: 4.5 },
  ),
  cube(45, "nether_gold_ore", { all: "nether_gold_ore" }, { hardness: 3 }),
  cube(46, "nether_quartz_ore", { all: "nether_quartz_ore" }, { hardness: 3 }),
  cube(
    47,
    "ancient_debris_side",
    { top: "ancient_debris_top", side: "ancient_debris_side" },
    { hardness: 30 },
  ),

  // ── ID 48–54: Deepslate ───────────────────────────────────────────────────
  cube(
    48,
    "deepslate",
    { top: "deepslate_top", side: "deepslate" },
    { hardness: 3 },
  ),
  cube(
    49,
    "cobbled_deepslate",
    { all: "cobbled_deepslate" },
    { hardness: 3.5 },
  ),
  cube(
    50,
    "polished_deepslate",
    { all: "polished_deepslate" },
    { hardness: 3.5 },
  ),
  cube(51, "deepslate_bricks", { all: "deepslate_bricks" }, { hardness: 3.5 }),
  cube(52, "deepslate_tiles", { all: "deepslate_tiles" }, { hardness: 3.5 }),

  // ── ID 53–60: Stone bricks ────────────────────────────────────────────────
  cube(53, "stone_bricks", { all: "stone_bricks" }, { hardness: 1.5 }),
  cube(
    54,
    "cracked_stone_bricks",
    { all: "cracked_stone_bricks" },
    { hardness: 1.5 },
  ),
  cube(
    55,
    "mossy_stone_bricks",
    { all: "mossy_stone_bricks" },
    { hardness: 1.5 },
  ),
  cube(56, "cobblestone", { all: "cobblestone" }, { hardness: 2 }),
  cube(57, "mossy_cobblestone", { all: "mossy_cobblestone" }, { hardness: 2 }),

  // ── ID 58–65: Nether ──────────────────────────────────────────────────────
  cube(58, "netherrack", { all: "netherrack" }, { hardness: 0.4 }),
  cube(59, "nether_bricks", { all: "nether_bricks" }, { hardness: 2 }),
  cube(60, "soul_sand", { all: "soul_sand" }, { hardness: 0.5 }),
  cube(61, "soul_soil", { all: "soul_soil" }, { hardness: 0.75 }),
  cube(
    62,
    "basalt",
    { top: "basalt_top", side: "basalt_side" },
    { hardness: 1.25 },
  ),
  cube(
    63,
    "blackstone",
    { top: "blackstone_top", side: "blackstone" },
    { hardness: 1.5 },
  ),
  cube(
    64,
    "glowstone",
    { all: "glowstone" },
    { hardness: 0.3, lightEmission: 15 },
  ),
  cube(
    65,
    "shroomlight",
    { all: "shroomlight" },
    { hardness: 1.0, lightEmission: 15, flammable: true },
  ),
  cube(66, "magma", { all: "magma" }, { hardness: 0.5, lightEmission: 3 }),

  // ── ID 67–72: End ─────────────────────────────────────────────────────────
  cube(67, "end_stone", { all: "end_stone" }, { hardness: 3 }),
  cube(68, "end_stone_bricks", { all: "end_stone_bricks" }, { hardness: 3 }),
  cube(69, "purpur_block", { all: "purpur_block" }, { hardness: 1.5 }),
  cube(70, "obsidian", { all: "obsidian" }, { hardness: 50 }),

  // ── ID 71–86: Mineral blocks ──────────────────────────────────────────────
  cube(71, "coal_block", { all: "coal_block" }, { hardness: 5 }),
  cube(72, "iron_block", { all: "iron_block" }, { hardness: 5 }),
  cube(73, "gold_block", { all: "gold_block" }, { hardness: 3 }),
  cube(74, "diamond_block", { all: "diamond_block" }, { hardness: 5 }),
  cube(75, "redstone_block", { all: "redstone_block" }, { hardness: 5 }),
  cube(76, "emerald_block", { all: "emerald_block" }, { hardness: 5 }),
  cube(77, "lapis_block", { all: "lapis_block" }, { hardness: 3 }),
  cube(78, "netherite_block", { all: "netherite_block" }, { hardness: 50 }),
  cube(79, "amethyst_block", { all: "amethyst_block" }, { hardness: 1.5 }),

  // ── ID 80–95: Glass / transparent cubes ──────────────────────────────────
  cube(
    80,
    "glass",
    { all: "glass" },
    { transparent: true, lightFilter: 0, hardness: 0.3 },
  ),
  cube(
    81,
    "white_stained_glass",
    { all: "white_stained_glass" },
    { transparent: true, lightFilter: 0, hardness: 0.3 },
  ),
  cube(
    82,
    "orange_stained_glass",
    { all: "orange_stained_glass" },
    { transparent: true, lightFilter: 0, hardness: 0.3 },
  ),
  cube(
    83,
    "red_stained_glass",
    { all: "red_stained_glass" },
    { transparent: true, lightFilter: 0, hardness: 0.3 },
  ),
  cube(
    84,
    "blue_stained_glass",
    { all: "blue_stained_glass" },
    { transparent: true, lightFilter: 0, hardness: 0.3 },
  ),
  cube(
    85,
    "ice",
    { all: "ice" },
    { transparent: true, lightFilter: 1, hardness: 0.5 },
  ),
  cube(86, "packed_ice", { all: "packed_ice" }, { hardness: 0.5 }),
  cube(
    87,
    "blue_ice",
    { all: "blue_ice" },
    { hardness: 2.8, flammable: false },
  ),

  // ── ID 88–103: Terracotta / wool / concrete ───────────────────────────────
  cube(88, "terracotta", { all: "terracotta" }, { hardness: 1.25 }),
  cube(89, "white_terracotta", { all: "white_terracotta" }, { hardness: 1.25 }),
  cube(
    90,
    "orange_terracotta",
    { all: "orange_terracotta" },
    { hardness: 1.25 },
  ),
  cube(
    91,
    "white_wool",
    { all: "white_wool" },
    { hardness: 0.8, flammable: true },
  ),
  cube(
    92,
    "orange_wool",
    { all: "orange_wool" },
    { hardness: 0.8, flammable: true },
  ),
  cube(93, "white_concrete", { all: "white_concrete" }, { hardness: 1.8 }),
  cube(94, "orange_concrete", { all: "orange_concrete" }, { hardness: 1.8 }),

  // ── ID 104: Snow / ice / misc ─────────────────────────────────────────────
  cube(104, "snow", { all: "snow" }, { hardness: 0.2 }),
  cube(105, "clay", { all: "clay" }, { hardness: 0.6 }),
  cube(106, "gravel", { all: "gravel" }, { hardness: 0.6 }),
  cube(107, "sponge", { all: "sponge" }, { hardness: 0.6, flammable: true }),
  cube(108, "wet_sponge", { all: "wet_sponge" }, { hardness: 0.6 }),
  cube(
    109,
    "moss_block",
    { all: "moss_block" },
    { hardness: 0.1, flammable: true },
  ),
  cube(
    110,
    "hay_block",
    { top: "hay_block_top", side: "hay_block_side" },
    { hardness: 0.5, flammable: true },
  ),
  cube(
    111,
    "pumpkin",
    { top: "pumpkin_top", side: "pumpkin_side", north: "carved_pumpkin" },
    { hardness: 1 },
  ),
  cube(
    112,
    "melon",
    { top: "melon_top", side: "melon_side" },
    { hardness: 1, flammable: true },
  ),
  cube(
    113,
    "tnt",
    { top: "tnt_top", bottom: "tnt_bottom", side: "tnt_side" },
    { hardness: 0, flammable: true },
  ),
  cube(
    114,
    "farmland",
    { top: "farmland", bottom: "dirt", side: "dirt" },
    { hardness: 0.6, fullCube: false },
  ),
  cube(
    115,
    "farmland_moist",
    { top: "farmland_moist", bottom: "dirt", side: "dirt" },
    { hardness: 0.6, fullCube: false },
  ),
  cube(
    116,
    "bookshelf",
    { top: "oak_planks", bottom: "oak_planks", side: "bookshelf" },
    { hardness: 1.5, flammable: true },
  ),
  cube(
    117,
    "crafting_table",
    {
      top: "crafting_table_top",
      bottom: "oak_planks",
      north: "crafting_table_front",
      south: "crafting_table_side",
      east: "crafting_table_front",
      west: "crafting_table_side",
    },
    { hardness: 2.5, flammable: false },
  ),

  // ── ID 118+: Cross / non-cube blocks ─────────────────────────────────────
  cross(118, "short_grass", "grass", { lightFilter: 0 }),
  cross(119, "fern", "fern", { lightFilter: 0 }),
  cross(120, "dead_bush", "dead_bush", { lightFilter: 0 }),
  cross(121, "dandelion", "dandelion", { lightFilter: 0 }),
  cross(122, "poppy", "poppy", { lightFilter: 0 }),
  cross(123, "blue_orchid", "blue_orchid", { lightFilter: 0 }),
  cross(124, "allium", "allium", { lightFilter: 0 }),
  cross(125, "cornflower", "cornflower", { lightFilter: 0 }),
  cross(126, "wither_rose", "wither_rose", { lightFilter: 0 }),
  cross(127, "sugar_cane", "sugar_cane", { lightFilter: 0, collidable: false }),

  // ── ID 128–129: Water / Lava ──────────────────────────────────────────────
  liquid(128, "water", "water_still", "water_flow", { lightFilter: 2 }),
  liquid(129, "lava", "lava_still", "lava_flow", {
    lightEmission: 15,
    lightFilter: 15,
  }),

  // ── ID 130: Torch ─────────────────────────────────────────────────────────
  {
    id: 130,
    name: "torch",
    modelType: ModelType.TORCH,
    faces: { all: "torch" },
    transparent: true,
    fullCube: false,
    lightEmission: 14,
    lightFilter: 0,
    collidable: false,
    flammable: false,
    hardness: 0,
  },
  {
    id: 131,
    name: "soul_torch",
    modelType: ModelType.TORCH,
    faces: { all: "soul_torch" },
    transparent: true,
    fullCube: false,
    lightEmission: 10,
    lightFilter: 0,
    collidable: false,
    flammable: false,
    hardness: 0,
  },
];

// ─── Fast lookup tables ───────────────────────────────────────────────────────

/** O(1) lookup by block ID. Sparse array — index = block ID. */
export const BLOCK_BY_ID: BlockModel[] = [];
for (const model of BLOCK_MODELS) {
  BLOCK_BY_ID[model.id] = model;
}

/** Lookup by name */
export const BLOCK_BY_NAME = new Map<string, BlockModel>(
  BLOCK_MODELS.map((m) => [m.name, m]),
);

/** Set of all block IDs that are opaque full cubes — used for fast face culling */
export const OPAQUE_FULL_CUBE_IDS = new Set<number>(
  BLOCK_MODELS.filter(
    (m) => !m.transparent && m.fullCube && m.modelType === ModelType.CUBE,
  ).map((m) => m.id),
);

/** Set of block IDs that should be rendered in the transparent pass */
export const TRANSPARENT_IDS = new Set<number>(
  BLOCK_MODELS.filter((m) => m.transparent).map((m) => m.id),
);

/** Set of block IDs that are liquids */
export const LIQUID_IDS = new Set<number>(
  BLOCK_MODELS.filter((m) => m.modelType === ModelType.LIQUID).map((m) => m.id),
);

/** Set of block IDs that are cross/plant models */
export const CROSS_IDS = new Set<number>(
  BLOCK_MODELS.filter((m) => m.modelType === ModelType.CROSS).map((m) => m.id),
);

/** Block IDs that emit light (for light propagation) */
export const LIGHT_EMITTERS = new Map<number, number>(
  BLOCK_MODELS.filter((m) => m.lightEmission > 0).map((m) => [
    m.id,
    m.lightEmission,
  ]),
);

export function getBlock(id: number): BlockModel {
  return BLOCK_BY_ID[id] ?? BLOCK_BY_ID[0]!; // Fallback to air
}

export function isOpaqueCube(id: number): boolean {
  return OPAQUE_FULL_CUBE_IDS.has(id);
}

export function isTransparent(id: number): boolean {
  return TRANSPARENT_IDS.has(id);
}

export function isLiquid(id: number): boolean {
  return LIQUID_IDS.has(id);
}

export function isCross(id: number): boolean {
  return CROSS_IDS.has(id);
}
