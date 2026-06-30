fx_version 'cerulean'
game 'gta5'
lua54 'yes'
author 'Luna Community'
description 'CarPlay - arac tableti (muzik + arac kontrol) — Luna Community'
version '1.1.0'

ui_page 'html/index.html'

shared_script 'config.lua'

client_script 'client.lua'
server_script 'server.lua'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js'
}

-- NOT: 'xsound' OPSIYONELDIR.
--  * xsound kuruluysa muzik senkron + 3D calar (etraftaki herkes duyar).
--  * kurulu degilse otomatik olarak yerel calmaya duser (sadece surucu duyar).
-- Bu yuzden burada zorunlu bir dependency tanimlanmadi.
