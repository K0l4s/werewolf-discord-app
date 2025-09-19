export function formatType(type) {
    return type
        .toLowerCase() // chuẩn hóa về lowercase trước
        .split("_") // tách theo dấu _
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // viết hoa chữ cái đầu
        .join(" "); // ghép lại bằng dấu cách
}
