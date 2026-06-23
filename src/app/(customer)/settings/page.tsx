"use client";

import React, { useState } from "react";
import { 
  Settings, 
  Shield, 
  Bell, 
  User, 
  Globe, 
} from "lucide-react";
import { CURRENT_USER_ID, mockDatabase } from "@/data/mockDatabase";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Image from "next/image";

type TabID = "profile" | "notifications" | "regional" | "security";

const CURRENCIES = [
  { value: "UGX", label: "UGX (Shilling)" },
  { value: "USD", label: "USD (Dollar)" },
  { value: "KES", label: "KES (Shilling)" },
];

const LANGUAGES = [
  { value: "en", label: "English (UG)" },
  { value: "sw", label: "Kiswahili" },
];

const MOMO_NETWORKS = [
  { value: "MTN", label: "MTN Mobile Money" },
  { value: "Airtel", label: "Airtel Money" },
];

const DELIVERY_DISTRICTS = ["Nakawa", "Central", "Makindye", "Rubaga", "Kawempe"];

export default function SettingsPage() {
  const userProfile = mockDatabase.settingsProfiles[CURRENT_USER_ID];

  // Navigation Routing Tab State
  const [activeTab, setActiveTab] = useState<TabID>("profile");

  // Live premium state hooks populated directly from the relational data layers
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [email, setEmail] = useState(userProfile.email);
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phoneNumber);
  
  const [emailAlerts, setEmailAlerts] = useState(userProfile.orderAlertsEmail);
  const [smsAlerts, setSmsAlerts] = useState(userProfile.securityAlertsSMS);
  const [marketingAlerts, setMarketingAlerts] = useState(userProfile.marketingNewsletter);
  
  const [currency, setCurrency] = useState(userProfile.currency);
  const [language, setLanguage] = useState(userProfile.primaryLanguage === "English (UG)" ? "en" : "sw");
  const [deliveryDistrict, setDeliveryDistrict] = useState(userProfile.deliveryDistrict);
  
  // Mobile Money parameters matching local Kampala transaction frameworks
  const [momoNumber, setMomoNumber] = useState(userProfile.momoNumber);
  const [momoNetwork, setMomoNetwork] = useState(userProfile.momoNetwork);

  return (
    <div className="max-w-8xl mx-auto px-4 py-10 space-y-10 text-foreground antialiased selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* Header Section */}
      <div className="border-b border-border/60 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-muted rounded-full border border-border/40">
            <Settings className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Account Settings
            </h1>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
              Manage your profile parameters, localized payment channels, notification routing, and multi-vendor tracking rules.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Hand Navigation Links / Fast Anchors */}
        <div className="space-y-1 md:col-span-1">
          <p className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase px-3 mb-2">
            Configurations
          </p>
          
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all text-left cursor-pointer ${
              activeTab === "profile" 
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-xs" 
                : "text-zinc-500 hover:bg-muted hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <User className="w-4 h-4" /> Account Profile
          </button>

          <button 
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all text-left cursor-pointer ${
              activeTab === "notifications" 
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-xs" 
                : "text-zinc-500 hover:bg-muted hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>

          <button 
            onClick={() => setActiveTab("regional")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all text-left cursor-pointer ${
              activeTab === "regional" 
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-xs" 
                : "text-zinc-500 hover:bg-muted hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Globe className="w-4 h-4" /> Regional Setup
          </button>

          <button 
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all text-left cursor-pointer ${
              activeTab === "security" 
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-xs" 
                : "text-zinc-500 hover:bg-muted hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Shield className="w-4 h-4" /> Login & Security
          </button>
        </div>

        {/* Right Hand Settings Content Cards */}
        <div className="md:col-span-2 space-y-6">
          
          {/* CARD 1: IDENTITY PROFILE */}
          {activeTab === "profile" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Identity Profile Settings</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Update workspace metadata credentials, security contacts, and store profile logos.</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4 pb-2">
                  <div className="w-14 h-14 bg-muted rounded-full border border-border relative overflow-hidden shrink-0">
                    <Image 
                      src={userProfile.avatarUrl} 
                      alt={fullName} 
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <button className="px-3.5 h-8 border border-border text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-full hover:bg-muted active:scale-95 transition-all cursor-pointer">
                      Change Photo
                    </button>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">JPG or PNG. Max 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">Full Name</label>
                    <Input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full h-10 px-4 focus:outline-none focus:border-primary transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">Email Address</label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full h-10 px-4 focus:outline-none focus:border-primary transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">Phone Contact</label>
                    <Input 
                      type="text" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full h-10 px-4 focus:outline-none focus:border-primary transition-all" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/60 flex justify-end gap-3">
                <button className="px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shadow-xs">
                  Save Profile Changes
                </button>
              </div>
            </div>
          )}

          {/* CARD 2: PREFERENCES & LOCALIZATION */}
          {activeTab === "regional" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Regional Setup & Preferences</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Configure default localized parameters for pricing metrics, payment routes, and fulfillment tracking.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Dynamic Primary Currency */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">Primary Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full px-4 h-10">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-card border border-border">
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value} className="text-xs font-semibold">
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic System Language */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">System Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full px-4 h-10">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-card border border-border">
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value} className="text-xs font-semibold">
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic Delivery District */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">Delivery District</Label>
                    <Select value={deliveryDistrict} onValueChange={setDeliveryDistrict}>
                      <SelectTrigger className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full px-4 h-10">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-card border border-border">
                        {DELIVERY_DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district} className="text-xs font-semibold">
                            {district === "Central" ? "Kampala Central" : district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Localized Mobile Money Payment Layer Wallet Setup */}
                <div className="border-t border-border/60 pt-5 space-y-3">
                  <p className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                    Integrated Payout & Disbursal Channels
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Dynamic Mobile Money Network */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">Mobile Money Network</Label>
                      <Select value={momoNetwork} onValueChange={setMomoNetwork}>
                        <SelectTrigger className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full px-4 h-10">
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-card border border-border">
                          {MOMO_NETWORKS.map((net) => (
                            <SelectItem key={net.value} value={net.value} className="text-xs font-semibold">
                              {net.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">MoMo Payment Number</Label>
                      <Input 
                        type="text" 
                        value={momoNumber} 
                        onChange={(e) => setMomoNumber(e.target.value)}
                        className="w-full text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-card border border-border rounded-full h-10 px-4 focus:outline-none focus:border-primary transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/60 flex justify-end gap-3">
                <button className="px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shadow-xs">
                  Save Regional Rules
                </button>
              </div>
            </div>
          )}

          {/* CARD 3: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Alert Channels & Tracking</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Control real-time updates regarding multi-vendor transactions, checkout dispatches, and campaign updates.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 divide-y divide-border/60 space-y-4">
                {/* Toggle Row 1 */}
                <div className="flex items-center justify-between pb-4">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Email Dispatch Routing</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Receive comprehensive marketplace checkout summaries and automated receipts.</p>
                  </div>
                  <button 
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-200 ease-in-out cursor-pointer ${emailAlerts ? 'bg-primary flex justify-end' : 'bg-muted border border-border/60 flex justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 shadow-xs block"></span>
                  </button>
                </div>

                {/* Toggle Row 2 */}
                <div className="flex items-center justify-between pt-4 pb-4">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">SMS Security Alerts</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Get direct smartphone text alerts for sensitive merchant dashboard modifications or profile shifts.</p>
                  </div>
                  <button 
                    onClick={() => setSmsAlerts(!smsAlerts)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-200 ease-in-out cursor-pointer ${smsAlerts ? 'bg-primary flex justify-end' : 'bg-muted border border-border/60 flex justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 shadow-xs block"></span>
                  </button>
                </div>

                {/* Toggle Row 3 */}
                <div className="flex items-center justify-between pt-4 pb-4">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Campaign Flash Sales</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Notify me immediately when automated multi-vendor price cuts or markdown campaign tokens activate.</p>
                  </div>
                  <button 
                    onClick={() => setMarketingAlerts(!marketingAlerts)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-200 ease-in-out cursor-pointer ${marketingAlerts ? 'bg-primary flex justify-end' : 'bg-muted border border-border/60 flex justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 shadow-xs block"></span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/60 flex justify-end gap-3">
                <button className="px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shadow-xs">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* CARD 4: SECURITY */}
          {activeTab === "security" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Security & Credentials</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Enforce safe workspace sessions, protect administrative actions, and audit access flags.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between text-xs pb-4 border-b border-border/60">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      Two-Factor Authentication (2FA)
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Secure your customer dashboard access via an authorization phone token layer.</p>
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 rounded-md">
                    Inactive
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">Buyer Protection Protocol</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Enforce safe delivery escrow holding gates across all multi-vendor orders automatically.</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
                    userProfile.buyerProtectionEnabled 
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60" 
                      : "bg-muted text-zinc-400 dark:text-zinc-500 border-border"
                  }`}>
                    {userProfile.buyerProtectionEnabled ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/60 flex justify-end items-center gap-3">
                <button className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all cursor-pointer">
                  Cancel
                </button>
                <button className="px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shadow-xs">
                  Save System Settings
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}