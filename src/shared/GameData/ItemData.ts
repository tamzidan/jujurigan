export interface ItemInfo {
	Name: string;
	Type: string;
	Description: string;
	Cost: number;
	Uses: number;
}

export const ItemData: Record<string, ItemInfo> = {
	Medkit: {
		Name: "Kotak P3K",
		Type: "Healing",
		Description: "Digunakan untuk menyembuhkan status Injured menjadi Sehat dengan cepat.",
		Cost: 100, // Sekali pakai
		Uses: 1, // Berapa kali bisa dipakai dalam 1 ronde
	},
	Senter: {
		Name: "Senter Polisi",
		Type: "Utility",
		Description: "Arahkan ke wajah Jurig untuk membutakannya sementara.",
		Cost: 150,
		Uses: 1,
	},
	Toolbox: {
		Name: "Kotak Perkakas",
		Type: "Repair",
		Description: "Meningkatkan kecepatan memperbaiki Generator.",
		Cost: 120,
		Uses: 1,
	},
};