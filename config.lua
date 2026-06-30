Config = {}

-- Acilis
Config.Command       = 'carplay'      -- /carplay
Config.KeyDefault    = 'F7'           -- bos F-tusu (F6=admin, F11=telsiz dolu). FiveM Tus Ayarlari'ndan degistirilebilir.
Config.RequireDriver = true           -- true = sadece surucu acabilir (yolcu acamaz)

-- Muzik
Config.DefaultVolume = 0.45           -- 0.0 - 1.0
Config.AudioRange    = 30.0           -- xsound 3D duyulma menzili (metre) - sadece xsound yolunda
Config.AutoPlayOnPaste = false        -- link yapistirinca otomatik cal

-- Gorunum
Config.Accent = '#8fb2e6'             -- vurgu rengi (diger arayuzlerle uyumlu mavi)

-- Navigasyon hazir konumlari (GPS isareti koyar)
Config.NavPoints = {
    { label = 'Legion Meydani',  icon = 'pin',    x = 195.17,   y = -933.77 },
    { label = 'Hastane',         icon = 'cross',  x = 295.83,   y = -1446.94 },
    { label = 'Polis Merkezi',   icon = 'shield', x = 441.0,    y = -981.0 },
    { label = 'LS Customs',      icon = 'wrench', x = -337.18,  y = -136.7 },
    { label = 'Havalimani',      icon = 'plane',  x = -1037.0,  y = -2737.0 },
    { label = 'Benzinlik',       icon = 'fuel',   x = 49.41,    y = 2778.79 },
    { label = 'Sandy Shores',    icon = 'pin',    x = 1961.0,   y = 3740.0 },
    { label = 'Paleto Bay',      icon = 'pin',    x = -110.0,   y = 6470.0 },
}
