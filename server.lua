-- ============================================================
--  Luna Community — qb-carplay · server.lua
--  Muzigi araca yakin oyunculara senkronlar (yalnizca xsound yolu).
--  GUVENLIK ("never trust the client"): gonderen oyuncu gercekten o
--  aracin yaninda olmali + cooldown + URL dogrulama.
-- ============================================================

local cooldown = {}

-- gonderen, hedef aracin yaninda mi?
local function playerNearVeh(src, netId)
    local veh = NetworkGetEntityFromNetworkId(netId)
    if not veh or veh == 0 or not DoesEntityExist(veh) then return false end
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return false end
    return #(GetEntityCoords(ped) - GetEntityCoords(veh)) < 8.0
end

-- spam kalkani (oyuncu basina ~0.7sn)
local function onCooldown(src)
    local now = GetGameTimer()
    if cooldown[src] and (now - cooldown[src]) < 700 then return true end
    cooldown[src] = now
    return false
end

local function validUrl(url)
    return url:find('^https?://') ~= nil and (url:find('youtube%.com') ~= nil or url:find('youtu%.be') ~= nil)
end

RegisterNetEvent('qb-carplay:server:play', function(netId, url, vol)
    local src = source
    if type(netId) ~= 'number' or type(url) ~= 'string' then return end
    if onCooldown(src) then return end
    if not validUrl(url) then return end
    if not playerNearVeh(src, netId) then return end
    local v = tonumber(vol) or 0.45
    if v < 0 then v = 0 elseif v > 1 then v = 1 end
    TriggerClientEvent('qb-carplay:client:play', -1, netId, url, v)
end)

RegisterNetEvent('qb-carplay:server:control', function(netId, act, value)
    local src = source
    if type(netId) ~= 'number' or type(act) ~= 'string' then return end
    if not playerNearVeh(src, netId) then return end
    TriggerClientEvent('qb-carplay:client:control', -1, netId, act, value)
end)

RegisterNetEvent('qb-carplay:server:stop', function(netId)
    local src = source
    if type(netId) ~= 'number' then return end
    if not playerNearVeh(src, netId) then return end
    TriggerClientEvent('qb-carplay:client:stop', -1, netId)
end)

AddEventHandler('playerDropped', function()
    cooldown[source] = nil
end)
