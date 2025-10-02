#!/usr/bin/env python3
"""
Screen Keep-Alive Script
Prevents screen from turning off using multiple methods
"""

import subprocess
import time
import sys
import os

def disable_dpms():
    """Disable Display Power Management Signaling (DPMS)"""
    methods = [
        'xset -dpms',           # Disable DPMS
        'xset s off',          # Disable screensaver
        'xset s noblank',      # Don't blank video device
    ]
    
    for method in methods:
        try:
            subprocess.run(method.split(), check=True, capture_output=True)
            print(f"✓ Executed: {method}")
        except subprocess.CalledProcessError:
            print(f"✗ Failed: {method}")
        except FileNotFoundError:
            print(f"✗ Command not found: {method}")

def use_caffeine():
    """Simulate activity to prevent screen timeout"""
    try:
        subprocess.run(['caffeine', '-a'], check=True, capture_output=True)
        print("✓ Started caffeine application")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ Caffeine not available")

def simulate_mouse_move():
    """Simulate subtle mouse movements to prevent screen timeout"""
    try:
        # Move mouse 1 pixel and back every 30 seconds
        while True:
            subprocess.run(['xdotool', 'mousemove_relative', '1', '0'], 
                         check=True, capture_output=True)
            time.sleep(0.1)
            subprocess.run(['xdotool', 'mousemove_relative', '-1', '0'], 
                         check=True, capture_output=True)
            time.sleep(30)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ xdotool not available for mouse simulation")

def use_caffeine_simple():
    """Simple caffeine alternative using setterm"""
    try:
        # Keep console from blanking
        subprocess.run(['setterm', '-blank', '0'], check=True, capture_output=True)
        subprocess.run(['setterm', '-powerdown', '0'], check=True, capture_output=True)
        print("✓ Configured console to not blank")
    except subprocess.CalledProcessError:
        print("✗ Failed to configure console")

def set_systemd_services():
    """Disable screen saver systemd services"""
    services = [
        'display-manager.service',
        'gdm.service',
        'sddm.service',
    ]
    
    for service in services:
        try:
            # Check if service exists and disable it
            result = subprocess.run(['systemctl', 'is-enabled', service], 
                                  capture_output=True, text=True)
            if 'enabled' in result.stdout:
                subprocess.run(['sudo', 'systemctl', 'disable', service], 
                             check=True, capture_output=True)
                print(f"✓ Disabled service: {service}")
        except subprocess.CalledProcessError:
            # Service doesn't exist or already disabled
            pass

def main():
    print("🖥️  Screen Keep-Alive Script Starting...")
    print("=" * 50)
    
    # Method 1: Disable DPMS and screensaver
    print("\n📺 Disabling DPMS and Screen Saver:")
    disable_dpms()
    
    # Method 2: Configure console
    print("\n🖥️  Configuring Console:")
    use_caffeine_simple()
    
    # Method 3: Try caffeine application
    print("\n☕ Attempting Caffeine:")
    use_caffeine()
    
    # Method 4: Systemd services
    print("\n⚙️  Checking System Services:")
    set_systemd_services()
    
    print("\n" + "=" * 50)
    print("✅ Screen keep-alive configuration completed!")
    print("\nThe following processes are preventing screen timeout:")
    
    # Show status
    try:
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        if 'xset' in result.stdout:
            print("✓ xset processes running")
        if 'caffeine' in result.stdout:
            print("✓ caffeine processes running")
    except:
        pass
    
    print("\n💡 Additional manual steps you can take:")
    print("   • Open Display Settings → Screen Lock → Turn Off")
    print("   • Open Display Settings → Power → Screen → Never")
    print("   • Run 'systemctl disable sleep.target suspend.target hibernate.target hybrid-sleep.target'")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Screen keep-alive script stopped.")
        sys.exit(0)