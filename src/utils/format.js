export function formatType(type) {
    return type
        .toLowerCase() // chuẩn hóa về lowercase trước
        .split("_") // tách theo dấu _
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // viết hoa chữ cái đầu
        .join(" "); // ghép lại bằng dấu cách
}

export const rarityIcons = {
    "Common": "<a:CO:1443541917769138266>",
    "Super Common": "<a:SC:1443542014212702303>",
    "Rare": "<a:RA:1443542008932335676>",
    "Super Rare": "<a:SR:1443542005522235477>",
    "Epic": "<a:EP:1443542001999151195>",
    "Super Epic": "<a:SP:1443541997762773084>",
    "Legendary": "<a:LE:1443541993342111845>",
    "Super Legendary": "<a:SL:1443541985704149062>",
    "Mythic": "<a:MY:1443541981383888897>",
    "Super Mythic":"<a:SM:1443541976690720769>"
};