// Geometry measured from the supplied PNGs. Pixel coordinates use their native 362px grid.
// Main figure only: adjacent figures accidentally present at file edges are excluded.
export type SpriteRect = readonly [number, number, number, number];
export type SpriteProfile = { file: string; game: SpriteRect; preview: SpriteRect; guide: SpriteRect; hull: ReadonlyArray<readonly [number, number]> };
export const SPRITE_PROFILES: readonly SpriteProfile[] = [
  { file: "01-goldnugget.png", game: [135, 181, 126, 102], preview: [91, 147, 189, 157], guide: [82, 125, 227, 188], hull: [[136, 235], [164, 198], [203, 184], [237, 183], [250, 202], [259, 236], [242, 271], [199, 281], [154, 262], [136, 241]] },
  { file: "02-goldmuenze.png", game: [105, 163, 173, 132], preview: [74, 125, 238, 187], guide: [75, 128, 246, 193], hull: [[106, 222], [137, 180], [187, 164], [244, 172], [270, 194], [276, 239], [256, 271], [210, 291], [173, 293], [113, 265]] },
  { file: "03-2er-muenzstapel.png", game: [76, 127, 191, 169], preview: [50, 92, 246, 227], guide: [49, 88, 259, 245], hull: [[81, 167], [98, 148], [160, 128], [216, 132], [262, 163], [258, 266], [212, 290], [168, 294], [99, 279], [80, 261]] },
  { file: "04-kleiner-edelstein.png", game: [78, 122, 187, 170], preview: [48, 89, 259, 232], guide: [49, 97, 249, 232], hull: [[79, 202], [107, 160], [167, 123], [233, 148], [263, 203], [216, 256], [172, 290], [165, 290], [127, 260], [79, 207]] },
  { file: "05-grosser-edelstein.png", game: [91, 61, 221, 195], preview: [53, 64, 279, 241], guide: [54, 71, 286, 249], hull: [[92, 139], [126, 91], [197, 62], [257, 68], [310, 138], [269, 192], [205, 254], [199, 254], [154, 216], [93, 146]] },
  { file: "06-gold-edelsteinbeutel.png", game: [46, 6, 279, 259], preview: [35, 38, 300, 269], guide: [33, 41, 309, 277], hull: [[47, 192], [80, 68], [143, 19], [203, 7], [268, 32], [323, 162], [307, 237], [275, 253], [91, 253], [55, 230]] },
  { file: "07-schatzkaestchen.png", game: [32, 19, 291, 240], preview: [25, 49, 317, 265], guide: [25, 59, 314, 260], hull: [[33, 111], [58, 66], [82, 49], [246, 20], [270, 29], [289, 46], [321, 107], [310, 223], [128, 257], [36, 216]] },
  { file: "08-goldener-kelch.png", game: [58, 0, 229, 255], preview: [64, 10, 242, 298], guide: [61, 31, 236, 282], hull: [[59, 13], [72, 0], [277, 0], [285, 14], [282, 65], [249, 233], [194, 253], [109, 244], [94, 232], [63, 70]] },
  { file: "09-krone.png", game: [30, 0, 287, 271], preview: [32, 0, 294, 303], guide: [47, 0, 295, 299], hull: [[31, 108], [41, 81], [139, 0], [212, 0], [307, 80], [315, 116], [281, 243], [250, 260], [131, 267], [63, 244]] },
  { file: "10-schatztruhe.png", game: [0, 0, 333, 295], preview: [0, 2, 338, 313], guide: [7, 0, 341, 312], hull: [[4, 130], [53, 20], [66, 0], [300, 0], [309, 21], [331, 239], [323, 267], [246, 293], [34, 282], [0, 267]] },
  { file: "11-koenigsschatz.png", game: [0, 0, 362, 303], preview: [0, 0, 362, 325], guide: [0, 0, 362, 314], hull: [[0, 186], [89, 0], [227, 0], [259, 23], [361, 211], [361, 257], [306, 291], [198, 301], [21, 284], [0, 272]] },
  { file: "12-goldener-thron.png", game: [14, 0, 315, 315], preview: [21, 0, 288, 330], guide: [22, 0, 282, 323], hull: [[15, 153], [18, 128], [25, 113], [97, 0], [308, 0], [327, 266], [324, 269], [236, 313], [23, 294], [17, 287]] },
];
