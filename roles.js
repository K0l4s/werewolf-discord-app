const roleList = [
    { name: "Sói", description: "Bạn là Sói. Hãy cùng đồng bọn giết hết dân làng.", image:"https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"},
    { name: "Dân làng", description: "Bạn là Dân làng. Hãy cố gắng tìm ra Sói.",image:"https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301" },
    { name: "Tiên tri", description: "Mỗi đêm bạn có thể soi 1 người.",image:"https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301" },
    { name: "Bảo vệ", description: "Bạn có thể bảo vệ 1 người mỗi đêm.",image:"https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301" },
];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function assignRoles(players) {
    const selectedRoles = [];

    selectedRoles.push(roleList[0]); // Sói
    selectedRoles.push(roleList[2]); // Tiên tri
    selectedRoles.push(roleList[3]); // Bảo vệ

    for (let i = selectedRoles.length; i < players.length; i++) {
        selectedRoles.push(roleList[1]); // Dân làng
    }

    shuffle(selectedRoles);

    const roleMap = new Map();
    for (let i = 0; i < players.length; i++) {
        roleMap.set(players[i], selectedRoles[i]);
    }

    return roleMap;
}

module.exports = {
    assignRoles
};
