import os

file_path = r"c:\Users\Asus\Desktop\thuyet trinh real\pages\messages.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    '"😊 Vui"': '"😊 Happy"',
    '"😢 Buồn"': '"😢 Sad"',
    '"😡 Tức"': '"😡 Angry"',
    '"❤️ Yêu"': '"❤️ Love"',
    '"🎮 Game"': '"🎮 Game"',
    '"👋 Chào"': '"👋 Greet"',
    
    'alert(`Không thể gửi tin nhắn: ${data.message || "Lỗi hệ thống"}`);': 'alert(`Cannot send message: ${data.message || "System error"}`);',
    'alert("Lỗi kết nối mạng.");': 'alert("Network connection error.");',
    
    'setSearchError("Đó là ID của chính bạn!");': 'setSearchError("That\'s your own ID!");',
    'setSearchError("Không tìm thấy người chơi với ID này.");': 'setSearchError("Player with this ID not found.");',
    'setSearchError("Lỗi kết nối. Thử lại nhé.");': 'setSearchError("Connection error. Please try again.");',
    
    'setSearchError(data.message || "Không thể gửi lời mời.");': 'setSearchError(data.message || "Cannot send request.");',
    'setSearchError("Lỗi kết nối.");': 'setSearchError("Connection error.");',
    
    '<h1>Tin nhắn & Bạn bè</h1>': '<h1>Messages & Friends</h1>',
    
    '💬 Tin nhắn': '💬 Messages',
    '👥 Bạn bè': '👥 Friends',
    
    'Đang tải...': 'Loading...',
    
    'Chưa có bạn bè': 'No friends yet',
    'Chuyển qua tab <strong>Bạn bè</strong> để thêm bạn!': 'Switch to the <strong>Friends</strong> tab to add them!',
    
    'tin nhắn mới': 'new messages',
    
    'ID của bạn': 'Your ID',
    
    'Tìm bạn theo Player ID': 'Find friends by Player ID',
    'Nhập ID...': 'Enter ID...',
    
    'Tìm thấy ✓': 'Found ✓',
    '➕ Kết bạn': '➕ Add Friend',
    
    'Lời mời kết bạn': 'Friend Requests',
    'Đã gửi lời mời': 'Sent Requests',
    'Chờ xác nhận': 'Pending',
    
    '>Hủy<': '>Cancel<',
    
    '>Bạn bè<': '>Friends<',
    'Chưa có bạn bè nào': 'No friends yet',
    
    'Chọn một người bạn để chat': 'Select a friend to chat',
    'Hoặc thêm bạn mới ở tab 👥 Bạn bè': 'Or add new friends in the 👥 Friends tab',
    
    'Chưa có tin nhắn. Nói xin chào đi! 👋': 'No messages yet. Say hello! 👋',
    
    'title="Biểu cảm"': 'title="Emoji"',
    'placeholder="Nhập tin nhắn..."': 'placeholder="Type a message..."',
    '>Gửi<': '>Send<'
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done replacing.")
