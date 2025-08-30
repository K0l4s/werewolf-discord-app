// drawImage.js
import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Khởi tạo __dirname cho ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hàm tạo ảnh chào mừng
export async function createImage(member, title, description, backgroundUrl = null) {
    // Kích thước cơ bản
    const baseWidth = 800;
    const baseHeight = 600;
    const padding = 40;
    
    // Tính toán chiều cao dựa trên nội dung
    const tempCanvas = createCanvas(baseWidth, baseHeight);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = '25px Arial';
    
    // Tính số dòng của title
    const maxTitleWidth = baseWidth - padding * 2;
    const titleLines = wrapText(tempCtx, title, maxTitleWidth, 40);
    const titleHeight = titleLines.length * 45;
    
    // Tính số dòng của description
    tempCtx.font = '25px Arial';
    const maxDescWidth = baseWidth - padding * 2;
    const descLines = wrapText(tempCtx, description, maxDescWidth, 25);
    const descHeight = descLines.length * 30;
    
    // Tính tổng chiều cao cần thiết
    const avatarArea = 80 + 150 + 60; // avatarY + avatarSize + spacing
    const additionalHeight = titleHeight + descHeight + 100; // +100 for username and member count
    const dynamicHeight = Math.max(baseHeight, avatarArea + additionalHeight);
    
    // Tạo canvas với chiều cao động
    const canvas = createCanvas(baseWidth, dynamicHeight);
    const ctx = canvas.getContext('2d');

    // Vẽ nền
    if (backgroundUrl) {
        try {
            const background = await loadImage(backgroundUrl);
            // Scale background to fit new height
            ctx.drawImage(background, 0, 0, baseWidth, dynamicHeight);
        } catch (error) {
            console.error('Lỗi khi tải ảnh nền:', error);
            drawGradientBackground(ctx, baseWidth, dynamicHeight);
        }
    } else {
        drawGradientBackground(ctx, baseWidth, dynamicHeight);
    }

    // Vẽ hình tròn cho avatar
    const avatarSize = 150;
    const avatarX = baseWidth / 2 - avatarSize / 2;
    const avatarY = 80;

    // Tạo hình tròn cho avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Tải và vẽ avatar
    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 256 }));
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } catch (error) {
        console.error('Lỗi khi tải avatar:', error);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }

    ctx.restore();

    // Vẽ viền cho avatar
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Vẽ tiêu đề
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Vẽ title (đã tính toán số dòng)
    let titleY = avatarY + avatarSize + 60;
    for (const line of titleLines) { 
        ctx.fillText(line, baseWidth / 2, titleY);
        titleY += 45; // Khoảng cách giữa các dòng
    }

    // Vẽ tên người dùng
    ctx.font = 'bold 30px Arial';
    ctx.fillText(member.user.username, baseWidth / 2, titleY + 20);

    // Vẽ mô tả
    ctx.font = '25px Arial';
    ctx.fillStyle = '#ffffff';

    // Vẽ description (đã tính toán số dòng)
    let descY = titleY + 60;
    for (const line of descLines) {
        ctx.fillText(line, baseWidth / 2, descY);
        descY += 30; // Khoảng cách giữa các dòng
    }

    // Vẽ số thành viên
    ctx.fillText(`Tổng thành viên: ${member.guild.memberCount}`, baseWidth / 2, descY + 30);

    // Tạo đường dẫn file
    const fileName = `welcome-${member.user.id}-${Date.now()}.png`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, fileName);

    // Đảm bảo thư mục temp tồn tại
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Lưu ảnh
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    return filePath;
}

// Hàm hỗ trợ xuống dòng cho text dài (cải tiến)
// Phiên bản tối ưu nhất - sử dụng binary search để tìm điểm ngắt dòng tốt nhất
function wrapText(ctx, text, maxWidth, fontSize) {
    if (!text || typeof text !== 'string') return [''];
    
    ctx.font = `${fontSize}px Arial`;
    const lines = [];
    let currentIndex = 0;
    const textLength = text.length;

    while (currentIndex < textLength) {
        let low = currentIndex;
        let high = textLength;
        let bestIndex = currentIndex;

        // Binary search để tìm vị trí ngắt dòng tối ưu
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const testText = text.substring(currentIndex, mid);
            const testWidth = ctx.measureText(testText).width;

            if (testWidth <= maxWidth) {
                bestIndex = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        // Tìm vị trí ngắt dòng tự nhiên (khoảng trắng hoặc dấu câu)
        let breakIndex = bestIndex;
        
        // Tìm khoảng trắng gần nhất để ngắt dòng tự nhiên
        if (breakIndex < textLength) {
            for (let i = breakIndex; i > currentIndex; i--) {
                if (/\s/.test(text[i]) || /[.,!?;:]/.test(text[i])) {
                    breakIndex = i + 1;
                    break;
                }
            }
        }

        const line = text.substring(currentIndex, breakIndex).trim();
        if (line) {
            lines.push(line);
        }
        
        currentIndex = breakIndex;
        
        // Bỏ qua các khoảng trắng ở đầu dòng mới
        while (currentIndex < textLength && /\s/.test(text[currentIndex])) {
            currentIndex++;
        }
    }

    return lines;
}

// Hàm vẽ nền gradient (cải tiến cho chiều cao động)
function drawGradientBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(0.5, '#2980b9');
    gradient.addColorStop(1, '#8e44ad');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Thêm hiệu ứng ánh sáng
    const radialGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width / 2
    );
    radialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    radialGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = radialGradient;
    ctx.fillRect(0, 0, width, height);
}

// Hàm dọn dẹp file ảnh tạm
export function cleanupTempImages() {
    const tempDir = path.join(process.cwd(), 'temp');
    if (fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) {
                console.error('Lỗi khi đọc thư mục temp:', err);
                return;
            }

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                try {
                    // Chỉ xóa file cũ hơn 1 giờ
                    const stats = fs.statSync(filePath);
                    const now = new Date().getTime();
                    const endTime = new Date(stats.ctime).getTime() + 3600000; // 1 giờ
                    
                    if (now > endTime) {
                        fs.unlinkSync(filePath);
                        console.log('Đã xóa file tạm:', filePath);
                    }
                } catch (error) {
                    console.error('Lỗi khi xóa file tạm:', error);
                }
            });
        });
    }
}

// Hàm tính toán kích thước văn bản
export function calculateTextSize(ctx, text, maxWidth, fontSize, lineHeight) {
    ctx.font = `${fontSize}px Arial`;
    const lines = wrapText(ctx, text, maxWidth, fontSize);
    return {
        lines: lines,
        height: lines.length * lineHeight,
        width: Math.max(...lines.map(line => ctx.measureText(line).width))
    };
}