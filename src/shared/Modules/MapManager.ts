import { ServerStorage, Workspace } from "@rbxts/services";

const MapStorage = ServerStorage.WaitForChild("MapStorage") as Folder;
const PrefabStorage = ServerStorage.WaitForChild("PrefabStorage") as Folder;

// Variabel untuk melacak map yang sedang aktif
let currentMap: Model | undefined = undefined;

// Fungsi pembantu untuk mengacak array (pengganti tabel di Lua)
function ShuffleArray<T>(array: T[]) {
	math.randomseed(os.time());
	for (let i = array.size() - 1; i > 0; i--) {
		const j = math.floor(math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

export namespace MapManager {
	// Fungsi utama untuk memuat map dan mengacak objek
	export function LoadRandomMap(): boolean {
		// 1. Pilih map secara acak dari folder MapStorage
		const maps = MapStorage.GetChildren();
		if (maps.size() === 0) {
			warn("Tidak ada map di ServerStorage/MapStorage!");
			return false;
		}

		const randomMapTemplate = maps[math.floor(math.random() * maps.size())] as Model;
		currentMap = randomMapTemplate.Clone();
		currentMap.Parent = Workspace;
		print(`Map ${currentMap.Name} telah dimuat.`);

		// 2. Proses Pengacakan Hook
		// Asumsi: Di dalam map, ada Part transparan bernama "HookSpawn"
		const allHookSpawns: BasePart[] = [];
		for (const desc of currentMap.GetDescendants()) {
			if (desc.Name === "HookSpawn" && desc.IsA("BasePart")) {
				allHookSpawns.push(desc);
			}
		}

		const maxHooks = 4; // Jumlah Hook yang ingin dimunculkan (Bisa disesuaikan nanti)
		const numToSpawn = math.min(maxHooks, allHookSpawns.size());

		if (numToSpawn > 0) {
			ShuffleArray(allHookSpawns);
			const hookPrefab = PrefabStorage.FindFirstChild("TumbalHook") as Model | undefined;

			if (hookPrefab) {
				// Munculkan hook di titik-titik yang terpilih
				for (let i = 0; i < numToSpawn; i++) {
					const spawnPoint = allHookSpawns[i];
					const newHook = hookPrefab.Clone();
					newHook.PivotTo(spawnPoint.CFrame);
					// Masukkan hook ke dalam folder map yang sedang aktif agar rapi
					newHook.Parent = currentMap;
				}
			} else {
				warn("Prefab 'TumbalHook' tidak ditemukan di ServerStorage/PrefabStorage!");
			}
		}

		// 3. Hapus semua titik spawn (yang terpilih maupun tidak) agar arena bersih
		for (const spawnPoint of allHookSpawns) {
			spawnPoint.Destroy();
		}

		// (Nantinya, Anda bisa menambahkan logika yang sama di sini untuk GeneratorSpawn, PalletSpawn, dll)

		return true;
	}

	// Fungsi untuk menghapus map saat ronde berakhir
	export function ClearMap() {
		if (currentMap) {
			currentMap.Destroy();
			currentMap = undefined;
			print("Map telah dibersihkan.");
		}
	}
}