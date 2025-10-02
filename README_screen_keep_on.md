# Screen Keep-On Solution

This repository contains comprehensive scripts to prevent your screen from turning off and ensure it stays always on.

## 🚀 Quick Start

### Option 1: Shell Script (Recommended)
```bash
./keep_screen_on.sh
```

### Option 2: Python Script
```bash
python3 keep_screen_on.py
```

## 📋 What These Scripts Do

### ✅ Applied Automatically:
- **Disable DPMS** (Display Power Management Signaling)
- **Disable Screensaver** 
- **Disable Console Blanking**
- **Configure GNOME Settings** (if GNOME detected)
- **Start Keep-Alive Process** (mouse movement simulation)

### 🛠️ Methods Used:

1. **X11/Xorg Settings:**
   - `xset -dpms` - Disable Display Power Management
   - `xset s off` - Disable screensaver
   - `xset s noblank` - Don't blank video device

2. **Console Settings:**
   - `setterm -blank 0` - Disable console blanking
   - `setterm -powerdown 0` - Disable console powerdown

3. **Desktop Environment:**
   - GNOME settings via `gsettings`
   - KDE settings support ready

4. **System-wide:**
   - Disable systemd sleep/suspend targets
   - Maintain running process for continuous prevention

## 🔧 Installation Requirements

### For Full Functionality:
```bash
# X11 utilities
sudo apt install x11-xserver-utils

# Mouse automation (for keep-alive)
sudo apt install xdotool

# GNOME settings (if using GNOME)
sudo apt install gnome-settings-daemon
```

### Minimal Requirements:
- `setterm` (usually pre-installed)
- `bash` or `python3`

## 🎯 Usage Examples

### Basic Usage:
```bash
# Make executable and run
chmod +x keep_screen_on.sh
./keep_screen_on.sh
```

### With Root Privileges (Recommended):
```bash
sudo ./keep_screen_on.sh
```

### Python Alternative:
```bash
chmod +x keep_screen_on.py
python3 keep_screen_on.py
```

## 🔄 Running in Background

### Start Background Process:
```bash
nohup ./keep_screen_on.sh > screen_keep_on.log 2>&1 &
```

### Check Status:
```bash
# Check if keep-alive is running
ps aux | grep keep_screen_on

# Check log
tail -f screen_keep_on.log
```

### Stop Background Process:
```bash
# Find and kill the process
pkill -f keep_screen_on

# Or find PID and kill manually
ps aux | grep keep_screen_on
kill <PID>
```

## 📱 Desktop Environment Specific

### GNOME:
```bash
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.screensaver idle-activation-enabled false
```

### KDE:
```bash
# Plasma settings (if kdeconfig is available)
kwriteconfig5 --file kscreenlockerrc --group Daemon --key Autolock false
```

### XFCE:
```bash
xfconf-query -c xfce4-session -p /shutdown/LockScreen -s false
xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/dpms-enabled -s false
```

## 🛑 Stopping the Keep-Alive

### Manual Stop:
```bash
# If running in foreground, press Ctrl+C

# If running in background, find and kill:
ps aux | grep keep_screen_on
kill <PID>
```

### Reset Settings:
```bash
# Re-enable DPMS
xset +dpms

# Re-enable screensaver  
xset s on

# Set idle delay back
gsettings set org.gnome.desktop.session idle-delay 300
```

## 🔧 Troubleshooting

### Common Issues:

1. **"xset not found"**
   ```bash
   sudo apt install x11-xserver-utils
   ```

2. **"Permission denied"**
   ```bash
   sudo ./keep_screen_on.sh
   ```

3. **Settings don't persist**
   - Run as root/sudo
   - Add to startup applications
   - Use systemd service

4. **WSL/Windows Subsystem for Linux**
   ```bash
   # WSL doesn't support X11 by default
   # Use Windows Power Management instead
   ```

### Check Current Settings:
```bash
# Check DPMS status
xset q

# Check GNOME settings
gsettings list-recursively org.gnome.desktop.screensaver

# Check systemd status
systemctl list-unit-files | grep sleep
```

## 🌟 Advanced Usage

### Create System Service:
```bash
# Create service file
sudo nano /etc/systemd/system/keep-screen-on.service
```

Add:
```ini
[Unit]
Description=Keep Screen Always On
After=multi-user.target

[Service]
Type=simple
User=root
ExecStart=/workspace/keep_screen_on.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable keep-screen-on.service
sudo systemctl start keep-screen-on.service
```

### Crontab for Periodic Check:
```bash
# Check every 10 minutes
*/10 * * * * /workspace/keep_screen_on.sh >> /var/log/screen_keep_on.log 2>&1
```

## ✅ Verification

### Test Screen Off Prevention:
1. Run the script
2. Wait for your usual timeout period
3. Screen should remain on
4. Check running processes:
   ```bash
   ps aux | grep -E "(xset|xdotool|keep_screen)"
   ```

## 📊 Compatibility

| System | Console | X11 | GNOME | Auto |
|--------|---------|-----|-------|------|
| Ubuntu/Debian | ✅ | ✅ | ✅ | ✅ |
| CentOS/RHEL | ✅ | ✅ | ⚠️ | ✅ |
| Fedora | ✅ | ✅ | ✅ | ✅ |
| Arch Linux | ✅ | ✅ | ✅ | ✅ |
| WSL | ✅ | ❌ | ❌ | ⚠️ |

## 🎯 Features

- ✅ **Multi-method approach** - Uses multiple techniques for maximum compatibility
- ✅ **Cross-platform** - Works on most Linux distributions  
- ✅ **Automatic detection** - Adapts to available tools
- ✅ **Background operation** - Can run as service
- ✅ **Easy to stop** - Clean shutdown with Ctrl+C or kill
- ✅ **Comprehensive logging** - Shows what worked and what didn't
- ✅ **Root-friendly** - Works with and without sudo privileges

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Verify all dependencies are installed
3. Try running with sudo
4. Check logs for specific errors

---

**🎉 Enjoy your always-on screen!**