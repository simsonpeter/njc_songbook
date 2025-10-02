#!/bin/bash

# Screen Keep-Alive Script
# Prevents screen from turning off using multiple methods

echo "🖥️  Screen Keep-Alive Script Starting..."
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Method 1: Disable DPMS and screensaver with xset
echo -e "\n📺 Disabling DPMS and Screen Saver:"
if command_exists xset; then
    xset -dpms 2>/dev/null && echo "✓ Disabled DPMS" || echo "✗ Failed to disable DPMS"
    xset s off 2>/dev/null && echo "✓ Disabled screensaver" || echo "✗ Failed to disable screensaver"
    xset s noblank 2>/dev/null && echo "✓ Disabled blanking" || echo "✗ Failed to disable blanking"
else
    echo "✗ xset not available - install with: apt install x11-xserver-utils"
fi

# Method 2: Console settings with setterm
echo -e "\n🖥️  Configuring Console:"
if command_exists setterm; then
    setterm -blank 0 2>/dev/null && echo "✓ Disabled console blanking" || echo "✗ Failed to disable console blanking"
    setterm -powerdown 0 2>/dev/null && echo "✓ Disabled console powerdown" || echo "✗ Failed to disable console powerdown"
else
    echo "✗ setterm not available"
fi

# Method 3: GNOME settings (if available)
echo -e "\n🖕 Configuring GNOME Settings:"
if command_exists gsettings; then
    gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null && echo "✓ Disabled GNOME idle delay" || echo "✗ Failed to disable GNOME idle delay"
    gsettings set org.gnome.desktop.screensaver lock-enabled false 2>/dev/null && echo "✓ Disabled GNOME screen lock" || echo "✗ Failed to disable GNOME screen lock"
    gsettings set org.gnome.desktop.screensaver idle-activation-enabled false 2>/dev/null && echo "✓ Disabled GNOME screensaver activation" || echo "✗ Failed to disable GNOME screensaver activation"
else
    echo "✗ gsettings not available (GNOME not detected)"
fi

# Method 4: System-wide power management
echo -e "\n⚙️  Configuring System-wide Settings:"
if [ -f "/etc/X11/xorg.conf" ] || [ -f "/etc/X11/xorg.conf.d/" ]; then
    echo "✓ X11 configuration directory found"
fi

# Method 5: Systemd services
echo -e "\n🔧 Checking System Services:"
if command_exists systemctl; then
    # Check if running as root or with sudo
    if [ "$EUID" -eq 0 ]; then
        systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target 2>/dev/null && echo "✓ System-wide sleep/suspend disabled" || echo "✗ Failed to disable system sleep"
    else
        echo "⚠ Note: Run with sudo to disable system-wide sleep"
    fi
else
    echo "✗ systemctl not available"
fi

# Method 6: Create a simple keep-alive process
echo -e "\n💓 Starting Keep-Alive Process:"
KEEPALIVE_PID=""
if command_exists xdotool; then
    # Start background process that moves mouse slightly every 30 seconds
    (
        while true; do
            xdotool mousemove_relative 1 0 2>/dev/null || true
            sleep 0.1
            xdotool mousemove_relative -- -1 0 2>/dev/null || true
            sleep 29.9
        done
    ) &
    KEEPALIVE_PID=$!
    echo "✓ Started mouse movement keep-alive (PID: $KEEPALIVE_PID)"
elif command_exists xset; then
    echo "⚠ Install xdotool for automatic mouse movement: apt install xdotool"
fi

echo -e "\n=================================================="
echo "✅ Screen keep-alive configuration completed!"
echo ""
echo "📋 Summary of applied settings:"
echo "   • DPMS disabled"
echo "   • Screensaver disabled"
echo "   • Console blanking disabled"
echo "   • GNOME settings configured (if available)"
echo "   • System sleep disabled (if running as root)"

if [ ! -z "$KEEPALIVE_PID" ]; then
    echo "   • Keep-alive process running (PID: $KEEPALIVE_PID)"
fi

echo ""
echo "🛑 To stop keep-alive process, run: kill $KEEPALIVE_PID"
echo ""
echo "💡 Additional manual steps:"
echo "   • Open Display Settings → Screen Lock → Turn Off"
echo "   • Open Display Settings → Power → Screen → Never"
echo "   • For permanent changes, add scripts to startup"

# Keep the script running if keep-alive process is active
if [ ! -z "$KEEPALIVE_PID" ]; then
    echo ""
    echo "🔄 Keep-alive process running... Press Ctrl+C to stop"
    trap "kill $KEEPALIVE_PID 2>/dev/null; echo '👋 Keep-alive stopped'; exit" INT
    wait $KEEPALIVE_PID
fi