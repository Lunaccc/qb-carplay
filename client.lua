-- ============================================================
--  qb-carplay  —  client.lua
--  Arac tableti: muzik (xsound/yerel) + arac kontrolleri + telemetri
--  by Tuna
-- ============================================================

local QBCore       = exports['qb-core']:GetCoreObject()

local isOpen       = false
local currentVeh   = nil
local windowsDown  = { false, false, false, false }
local musicNetId   = nil
local musicPlaying = false
local musicVeh     = nil

-- ---------- yardimcilar ----------
local function hasXsound()
    return GetResourceState('xsound') == 'started'
end

local function ytId(url)
    if type(url) ~= 'string' then return nil end
    return url:match('[?&]v=([%w_%-]+)')
        or url:match('youtu%.be/([%w_%-]+)')
        or url:match('/embed/([%w_%-]+)')
        or url:match('/shorts/([%w_%-]+)')
        or url:match('/live/([%w_%-]+)')
end

local function urlencode(s)
    return (s:gsub("[^%w%-_%.~]", function(c) return string.format("%%%02X", string.byte(c)) end))
end

-- HTTP GET'i server'a yaptirir (PerformHttpRequest yalnizca server'da var).
-- Server tarafi host whitelist ile dogrular (SSRF kalkani).
local function httpGet(url, headers, cb)
    QBCore.Functions.TriggerCallback('qb-carplay:server:httpGet', function(res)
        res = res or {}
        cb(res.code or 0, res.body)
    end, url, headers or {})
end

local function vehName(veh)
    local model = GetEntityModel(veh)
    local disp  = GetDisplayNameFromVehicleModel(model)
    local name  = GetLabelText(disp)
    if name == nil or name == 'NULL' or name == '' then name = disp end
    local make  = GetMakeNameFromVehicleModel(model)
    if make and make ~= '' then
        local ml = GetLabelText(make)
        if ml and ml ~= 'NULL' and ml ~= '' then return ml .. ' ' .. name end
    end
    return name
end

local function plateOf(veh)
    local p = GetVehicleNumberPlateText(veh)
    return p and (p:gsub('%s+$', '')) or ''
end

local function hasKeys(veh)
    local plate = plateOf(veh)
    local ok, res = pcall(function() return exports['qb-vehiclekeys']:HasKeys(plate) end)
    if ok then return res end
    return true -- qb-vehiclekeys yoksa engelleme
end

-- arac kontrol durumunu oku (UI yansitmasi icin)
local function controlState(veh)
    local _, lightsOn, highOn = GetVehicleLightsState(veh)
    local doors = {}
    for i = 0, 5 do doors[i + 1] = GetVehicleDoorAngleRatio(veh, i) > 0.0 end
    return {
        engine   = IsVehicleEngineOn(veh),
        locked   = GetVehicleDoorLockStatus(veh) == 2,
        lights   = lightsOn == 1 or highOn == 1,
        neon     = IsVehicleNeonLightEnabled(veh, 0),
        doors    = doors,
        windows  = windowsDown,
    }
end

local function pushControls()
    if currentVeh and DoesEntityExist(currentVeh) then
        SendNUIMessage({ action = 'controls', data = controlState(currentVeh) })
    end
end

-- ---------- ac / kapa ----------
local function openCarplay()
    if isOpen then return end
    local ped = PlayerPedId()
    if not IsPedInAnyVehicle(ped, false) then
        QBNotify('Once bir araca binmelisin.')
        return
    end
    local veh = GetVehiclePedIsIn(ped, false)
    if Config.RequireDriver and GetPedInVehicleSeat(veh, -1) ~= ped then
        QBNotify('CarPlay sadece surucu koltugunda acilir.')
        return
    end

    currentVeh = veh
    -- yeni araca girince cam durumunu sifirla (gercek durumu bilemeyiz)
    windowsDown = { false, false, false, false }
    isOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action  = 'open',
        accent  = Config.Accent,
        vehicle = { name = vehName(veh), plate = plateOf(veh) },
        nav     = Config.NavPoints,
        hasXsound = hasXsound(),
        controls = controlState(veh),
    })

    -- telemetri + cikis bekcisi
    CreateThread(function()
        local last = {}
        while isOpen do
            local v = currentVeh
            if v and DoesEntityExist(v) and IsPedInAnyVehicle(PlayerPedId(), false) then
                local speed  = math.floor(GetEntitySpeed(v) * 3.6 + 0.5)
                local rpm    = math.floor(GetVehicleCurrentRpm(v) * 100 + 0.5)
                local gear   = GetVehicleCurrentGear(v)
                local fuel   = math.floor((GetVehicleFuelLevel(v) or 0) + 0.5)
                local health = math.max(0, math.floor(GetVehicleEngineHealth(v) / 10 + 0.5))
                -- yalnizca bir deger DEGISTIYSE NUI'ye gonder (gereksiz mesaj = drop riski)
                if speed ~= last.speed or rpm ~= last.rpm or gear ~= last.gear or fuel ~= last.fuel or health ~= last.health then
                    last.speed, last.rpm, last.gear, last.fuel, last.health = speed, rpm, gear, fuel, health
                    SendNUIMessage({ action = 'telemetry', speed = speed, rpm = rpm, gear = gear, fuel = fuel, health = health })
                end
            else
                closeCarplay()
                break
            end
            Wait(250)
        end
    end)
end

function closeCarplay()
    if not isOpen then return end
    isOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

-- ---------- komut + tus ----------
RegisterCommand(Config.Command, function()
    if isOpen then closeCarplay() else openCarplay() end
end, false)
RegisterKeyMapping(Config.Command, 'CarPlay Tableti Ac/Kapat', 'keyboard', Config.KeyDefault)

-- basit bildirim (qb-core varsa onu kullan)
function QBNotify(msg)
    local ok = pcall(function()
        TriggerEvent('QBCore:Notify', msg, 'error')
    end)
    if not ok then print('[qb-carplay] ' .. msg) end
end

-- ---------- NUI: kapat ----------
RegisterNUICallback('close', function(_, cb)
    closeCarplay()
    cb({ ok = true })
end)

-- ---------- NUI: arac kontrolleri ----------
RegisterNUICallback('control', function(data, cb)
    local veh = currentVeh
    if not veh or not DoesEntityExist(veh) then cb({ ok = false }); return end
    local act = data.action

    if act == 'engine' then
        local on = not IsVehicleEngineOn(veh)
        SetVehicleEngineOn(veh, on, false, true)

    elseif act == 'lock' then
        if not hasKeys(veh) then QBNotify('Bu aracin anahtari sende yok.'); cb({ ok = false }); return end
        local locked = GetVehicleDoorLockStatus(veh) == 2
        SetVehicleDoorsLocked(veh, locked and 1 or 2)
        PlayVehicleDoorCloseSound(veh, 0)

    elseif act == 'window' then
        local i = tonumber(data.value) or 0
        if windowsDown[i + 1] then RollUpWindow(veh, i) else RollDownWindow(veh, i) end
        windowsDown[i + 1] = not windowsDown[i + 1]

    elseif act == 'door' then
        local i = tonumber(data.value) or 0
        if GetVehicleDoorAngleRatio(veh, i) > 0.0 then
            SetVehicleDoorShut(veh, i, false)
        else
            SetVehicleDoorOpen(veh, i, false, false)
        end

    elseif act == 'lights' then
        local _, lo, ho = GetVehicleLightsState(veh)
        SetVehicleLights(veh, (lo == 1 or ho == 1) and 1 or 2)

    elseif act == 'neon' then
        local on = not IsVehicleNeonLightEnabled(veh, 0)
        for i = 0, 3 do SetVehicleNeonLightEnabled(veh, i, on) end

    elseif act == 'neoncolor' then
        local hex = tostring(data.value or '#8fb2e6'):gsub('#', '')
        local r = tonumber(hex:sub(1, 2), 16) or 143
        local g = tonumber(hex:sub(3, 4), 16) or 178
        local b = tonumber(hex:sub(5, 6), 16) or 230
        SetVehicleNeonLightsColour(veh, r, g, b)
        for i = 0, 3 do SetVehicleNeonLightEnabled(veh, i, true) end
    end

    pushControls()
    cb({ ok = true })
end)

-- ---------- NUI: navigasyon ----------
RegisterNUICallback('nav', function(data, cb)
    local x, y = tonumber(data.x), tonumber(data.y)
    if x and y then
        SetNewWaypoint(x + 0.0, y + 0.0)
        pcall(function() TriggerEvent('QBCore:Notify', 'Rota ayarlandi.', 'success') end)
    end
    cb({ ok = true })
end)

-- muzigi durdur (her iki mod) + bekciyi sonlandir
local function stopMusicAll(silent)
    musicPlaying = false
    musicVeh = nil
    if hasXsound() and musicNetId then
        TriggerServerEvent('qb-carplay:server:stop', musicNetId)
        musicNetId = nil
    end
    if not silent then SendNUIMessage({ action = 'forceStop' }) end
end

-- spotify track id
local function spfId(url)
    return url:match('open%.spotify%.com/track/([%w]+)') or url:match('spotify:track:([%w]+)')
end

-- YouTube'da ilk sonucu bul (API'siz; sonuc sayfasini ayristir)
local function ytSearchFirst(query, cb)
    local u = 'https://www.youtube.com/results?search_query=' .. urlencode(query)
    httpGet(u, { ['User-Agent'] = 'Mozilla/5.0', ['Accept-Language'] = 'tr,en' }, function(code, body)
        if code == 200 and body then
            cb(body:match('"videoId":"([%w_%-]+)"'))
        else
            cb(nil)
        end
    end)
end

-- aractan inince muzigi otomatik durdur (bekci)
local function startMusicWatcher()
    musicVeh = currentVeh
    if musicPlaying then return end
    musicPlaying = true
    CreateThread(function()
        while musicPlaying do
            Wait(700)
            if not (musicVeh and DoesEntityExist(musicVeh) and IsPedInVehicle(PlayerPedId(), musicVeh, false)) then
                stopMusicAll(false)
                break
            end
        end
    end)
end

-- cozulen videoyu oynat (her iki mod)
local function playResolved(vid, ytUrl, title, thumb, author)
    if hasXsound() and currentVeh and DoesEntityExist(currentVeh) then
        musicNetId = NetworkGetNetworkIdFromEntity(currentVeh)
        TriggerServerEvent('qb-carplay:server:play', musicNetId, ytUrl, Config.DefaultVolume)
        SendNUIMessage({ action = 'nowPlaying', mode = 'xsound',
            title = title, thumb = thumb, author = author or '', volume = Config.DefaultVolume })
    else
        SendNUIMessage({ action = 'nowPlaying', mode = 'local',
            videoId = vid, title = title, thumb = thumb, author = author or '', volume = Config.DefaultVolume })
    end
    startMusicWatcher()
end

-- ---------- NUI: muzik cal ----------
RegisterNUICallback('musicPlay', function(data, cb)
    local url    = tostring(data.url or '')
    local source = tostring(data.source or 'youtube')

    -- ===== SPOTIFY: spotify linki -> baslik/kapak (oEmbed) -> YouTube'da ara -> oynat =====
    if source == 'spotify' then
        cb({ ok = true })
        if not spfId(url) then SendNUIMessage({ action = 'musicError', msg = 'Gecersiz Spotify linki' }); return end
        local oe = 'https://open.spotify.com/oembed?url=' .. urlencode(url)
        httpGet(oe, {}, function(code, body)
            local title, art
            if code == 200 and body then
                local okj, d = pcall(json.decode, body)
                if okj and d then title = d.title; art = d.thumbnail_url end
            end
            if not title then SendNUIMessage({ action = 'musicError', msg = 'Spotify linki okunamadi' }); return end
            SendNUIMessage({ action = 'meta', title = title, author = 'Spotify', thumb = art })
            ytSearchFirst(title, function(vid)
                if not vid then SendNUIMessage({ action = 'musicError', msg = '"' .. title .. '" bulunamadi' }); return end
                playResolved(vid, 'https://www.youtube.com/watch?v=' .. vid, title, art, 'Spotify')
            end)
        end)
        return
    end

    -- ===== YOUTUBE: link -> hemen oynat -> baslik sonradan =====
    local vid = ytId(url)
    if not vid then cb({ ok = false, msg = 'Gecersiz YouTube linki' }); return end
    local thumb = ('https://img.youtube.com/vi/%s/hqdefault.jpg'):format(vid)
    playResolved(vid, url, 'YouTube', thumb, '')

    local oe = 'https://www.youtube.com/oembed?format=json&url=' .. urlencode(url)
    httpGet(oe, {}, function(code, body)
        if code == 200 and body then
            local okj, d = pcall(json.decode, body)
            if okj and d and d.title then
                SendNUIMessage({ action = 'meta', title = d.title,
                    author = d.author_name or '', thumb = d.thumbnail_url or thumb })
            end
        end
    end)

    cb({ ok = true })
end)

-- ---------- NUI: muzik kontrol (sadece xsound modunda Lua isi; yerelde NUI kendi yapar) ----------
RegisterNUICallback('musicControl', function(data, cb)
    local act = data.action
    if act == 'stop' then
        musicPlaying = false
        musicVeh = nil
        if hasXsound() and musicNetId then
            TriggerServerEvent('qb-carplay:server:stop', musicNetId)
            musicNetId = nil
        end
    elseif hasXsound() and musicNetId then
        TriggerServerEvent('qb-carplay:server:control', musicNetId, act, data.value)
    end
    cb({ ok = true })
end)

-- ============================================================
--  xsound senkron yayini (yalnizca xsound kuruluysa)
-- ============================================================
local function snd() return exports['xsound'] end

RegisterNetEvent('qb-carplay:client:play', function(netId, url, vol)
    if not hasXsound() then return end
    local veh = NetworkGetEntityFromNetworkId(netId)
    if not DoesEntityExist(veh) then return end
    local id = 'carplay_' .. netId
    pcall(function()
        snd():Destroy(id)
        snd():PlayUrlPos(id, url, vol or Config.DefaultVolume, GetEntityCoords(veh))
        snd():Distance(id, Config.AudioRange)
    end)
    -- sesi araci takip ettir
    CreateThread(function()
        while true do
            Wait(300)
            local ok, exists = pcall(function() return snd():soundExists(id) end)
            if not ok or not exists then break end
            local v = NetworkGetEntityFromNetworkId(netId)
            if DoesEntityExist(v) then pcall(function() snd():Position(id, GetEntityCoords(v)) end) end
        end
    end)
end)

RegisterNetEvent('qb-carplay:client:stop', function(netId)
    if not hasXsound() then return end
    pcall(function() snd():Destroy('carplay_' .. netId) end)
end)

RegisterNetEvent('qb-carplay:client:control', function(netId, act, value)
    if not hasXsound() then return end
    local id = 'carplay_' .. netId
    pcall(function()
        if act == 'pause' then snd():Pause(id)
        elseif act == 'resume' then snd():Resume(id)
        elseif act == 'volume' then snd():setVolume(id, tonumber(value) or Config.DefaultVolume)
        end
    end)
end)

-- kaynak durunca acik tablet kalmasin
AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() and isOpen then
        SetNuiFocus(false, false)
    end
end)
