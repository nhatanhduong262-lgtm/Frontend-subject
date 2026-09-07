import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const API_URL = `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:5000`;

const typeIcons = { Tablet: "▣", Scanner: "⌁", Display: "▤", Sensor: "◌" };

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Tablet", location: "", manufacturer: "", model: "", serial_number: "", image_url: "", notes: "", specifications: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const onlineCount = useMemo(() => devices.filter((device) => device.status === "Online").length, [devices]);
  const filteredDevices = useMemo(() => devices.filter((device) => {
    const matchesQuery = `${device.name} ${device.type} ${device.location}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "All status" || device.status === statusFilter);
  }), [devices, query, statusFilter]);

  useEffect(() => {
    if (!window.localStorage.getItem("userId")) router.replace("/login");
    fetch(`${API_URL}/devices`).then(async (response) => { if (!response.ok) throw new Error(await response.text()); return response.json(); }).then((result) => setDevices(result.devices || [])).catch((requestError) => setError(requestError.message || "Unable to load devices.")).finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("profile");
    router.push("/login");
  };
  const toggleDevice = async (device) => {
    const status = device.status === "Online" ? "Offline" : "Online";
    const response = await fetch(`${API_URL}/devices/${device.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) setDevices((current) => current.map((item) => item.id === device.id ? { ...item, status, last_seen: new Date().toISOString() } : item));
  };
  const removeDevice = async (id) => {
    if (!window.confirm("Remove this device?")) return;
    const response = await fetch(`${API_URL}/devices/${id}`, { method: "DELETE" });
    if (response.ok) setDevices((current) => current.filter((device) => device.id !== id));
  };
  const addDevice = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.location.trim()) return;
    const specifications = form.specifications.split("\n").reduce((result, line) => { const [key, ...value] = line.split(":"); if (key && value.length) result[key.trim()] = value.join(":").trim(); return result; }, {});
    const response = await fetch(`${API_URL}/devices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, specifications }) });
    if (response.ok) { const result = await response.json(); setDevices((current) => [result.device, ...current]); setForm({ name: "", type: "Tablet", location: "", manufacturer: "", model: "", serial_number: "", image_url: "", notes: "", specifications: "" }); setShowForm(false); }
  };

  const buttonStyle = { border: 0, borderRadius: 8, padding: "11px 16px", fontWeight: 700, cursor: "pointer" };
  const panelStyle = { background: "#fff", border: "1px solid #dce7e7", borderRadius: 10 };
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eef4ff 0%, #f8fafc 48%, #ecfdf5 100%)", fontFamily: "Inter, Arial, sans-serif", color: "#0f172a", display: "flex" }}>
      <aside style={{ width: 220, flexShrink: 0, background: "rgba(255,255,255,0.9)", borderRight: "1px solid #e2e8f0", padding: "28px 18px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 800, fontSize: 19, color: "#0f172a", padding: "0 12px 34px" }}>northstar<span style={{ color: "#0f766e" }}>.</span></div>
        <div style={{ padding: "0 12px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Workspace</div>
        {["Overview", "Devices", "Users", "Reports"].map((item) => <Link key={item} href={item === "Users" ? "/users" : "/devices"} style={{ textDecoration: "none", color: item === "Devices" ? "#0f766e" : "#64748b", background: item === "Devices" ? "#ccfbf1" : "transparent", borderRadius: 10, padding: "11px 12px", marginBottom: 4, fontWeight: item === "Devices" ? 700 : 500 }}>{item === "Devices" ? "◈" : "○"}<span style={{ marginLeft: 11 }}>{item}</span></Link>)}
        <div style={{ padding: "28px 12px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Manage</div>
        <Link href="/profile" style={{ textDecoration: "none", color: "#64748b", padding: "11px 12px" }}>⚙<span style={{ marginLeft: 11 }}>Settings</span></Link>
        <button type="button" onClick={handleLogout} style={{ marginTop: "auto", ...buttonStyle, color: "#b91c1c", background: "#fff1f2", textAlign: "left" }}>↪<span style={{ marginLeft: 11 }}>Log out</span></button>
      </aside>
      <section style={{ flex: 1, minWidth: 0, padding: "28px clamp(20px, 4vw, 54px) 48px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 32 }}>
          <div><div style={{ color: "#6b8585", fontSize: 13, marginBottom: 8 }}>Workspace / Devices</div><h1 style={{ margin: 0, fontSize: 32 }}>Devices</h1><p style={{ margin: "8px 0 0", color: "#6b8585" }}>Monitor and manage equipment across your workspace.</p></div>
          <button type="button" onClick={() => setShowForm((value) => !value)} style={{ ...buttonStyle, color: "#fff", background: "#0f766e" }}>＋ {showForm ? "Close form" : "Add device"}</button>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[['Total devices', devices.length, '#172b2d'], ['Online now', onlineCount, '#0f766e'], ['Offline', devices.length - onlineCount, '#c35b2f'], ['Connection rate', devices.length ? `${Math.round((onlineCount / devices.length) * 100)}%` : "0%", '#172b2d']].map(([label, value, color]) => <div key={label} style={{ ...panelStyle, padding: "18px 20px" }}><div style={{ color: "#6b8585", fontSize: 13 }}>{label}</div><strong style={{ display: "block", marginTop: 10, fontSize: 28, color }}>{value}</strong></div>)}
        </div>
        {showForm ? <form onSubmit={addDevice} style={{ ...panelStyle, padding: 20, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
          {[['name', 'Device name', 'e.g. Lobby screen', true], ['location', 'Location', 'e.g. Floor 1', true], ['manufacturer', 'Manufacturer', 'e.g. Apple'], ['model', 'Model', 'e.g. iPad Air'], ['serial_number', 'Serial number', 'e.g. SN-001'], ['image_url', 'Image URL', 'https://...']].map(([key, label, placeholder, required]) => <label key={key} style={{ display: "grid", gap: 7, color: "#294849", fontWeight: 700, fontSize: 13 }}>{label}<input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} required={required} style={{ border: "1px solid #c9ddda", borderRadius: 8, padding: "11px 12px" }} /></label>)}
          <label style={{ display: "grid", gap: 7, color: "#294849", fontWeight: 700, fontSize: 13 }}>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} style={{ border: "1px solid #c9ddda", borderRadius: 8, padding: "11px 12px" }}><option>Tablet</option><option>Scanner</option><option>Display</option><option>Sensor</option><option>POS terminal</option><option>Kiosk</option><option>Laptop</option><option>Camera</option><option>Printer</option><option>Access point</option><option>Mobile</option><option>Desktop</option></select></label>
          <label style={{ display: "grid", gap: 7, color: "#294849", fontWeight: 700, fontSize: 13 }}>Specifications<textarea value={form.specifications} onChange={(event) => setForm({ ...form, specifications: event.target.value })} placeholder="RAM: 8GB\nBattery: 10h" rows="3" style={{ border: "1px solid #c9ddda", borderRadius: 8, padding: "11px 12px" }} /></label>
          <button type="submit" style={{ ...buttonStyle, color: "#fff", background: "#12383a" }}>Create device</button>
        </form> : null}
        {error ? <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 12, padding: 16, marginBottom: 18 }}>{error} Run the devices migration in Supabase SQL Editor.</div> : null}
        {selectedDevice ? <div style={{ ...panelStyle, marginBottom: 18, padding: 22, display: "grid", gridTemplateColumns: "minmax(130px, 180px) 1fr auto", gap: 22, alignItems: "start" }}>
          <div style={{ height: 150, borderRadius: 10, overflow: "hidden", background: "#e8f5f2", display: "grid", placeItems: "center", color: "#0f766e", fontSize: 42 }}>{selectedDevice.image_url ? <img src={selectedDevice.image_url} alt={selectedDevice.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : typeIcons[selectedDevice.type]}</div>
          <div><div style={{ color: "#6b8585", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Device details</div><h2 style={{ margin: "7px 0 4px", fontSize: 23 }}>{selectedDevice.name}</h2><p style={{ margin: "0 0 14px", color: "#6b8585" }}>{selectedDevice.manufacturer} {selectedDevice.model} · {selectedDevice.serial_number || "No serial number"}</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>{Object.entries(selectedDevice.specifications || {}).map(([key, value]) => <div key={key} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}><div style={{ color: "#64748b", fontSize: 12 }}>{key}</div><strong style={{ display: "block", marginTop: 4, fontSize: 14 }}>{value}</strong></div>)}</div><p style={{ margin: "14px 0 0", color: "#475569", fontSize: 14 }}>{selectedDevice.notes || "No notes for this device."}</p></div>
          <button type="button" aria-label="Close device details" onClick={() => setSelectedDevice(null)} style={{ ...buttonStyle, padding: "7px 11px", color: "#64748b", background: "#f1f5f9" }}>×</button>
        </div> : null}
        <div style={{ ...panelStyle, overflow: "hidden", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #e6eeee", display: "flex", gap: 10, flexWrap: "wrap" }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices..." aria-label="Search devices" style={{ flex: "1 1 240px", border: "1px solid #d2e1e1", borderRadius: 8, padding: "10px 12px" }} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status" style={{ border: "1px solid #d2e1e1", borderRadius: 8, padding: "10px 12px" }}><option>All status</option><option>Online</option><option>Offline</option></select></div>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr style={{ background: "#f7faf9", textAlign: "left" }}>{["Device", "Type", "Location", "Last seen", "Status", "Actions"].map((heading) => <th key={heading} style={{ padding: "13px 18px", color: "#6b8585", fontSize: 11, textTransform: "uppercase" }}>{heading}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan="6" style={{ padding: 35, textAlign: "center", color: "#648181" }}>Loading devices...</td></tr> : filteredDevices.map((device) => <tr key={device.id} onClick={() => setSelectedDevice(device)} style={{ borderTop: "1px solid #e6eeee", cursor: "pointer" }}><td style={{ padding: "15px 18px", fontWeight: 700 }}><span style={{ display: "inline-grid", placeItems: "center", width: 32, height: 32, borderRadius: 8, overflow: "hidden", background: "#e8f5f2", color: "#0f766e", marginRight: 10 }}>{device.image_url ? <img src={device.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : typeIcons[device.type]}</span>{device.name}<small style={{ display: "block", marginLeft: 42, color: "#789090", fontWeight: 400 }}>{device.manufacturer} {device.model}</small></td><td style={{ padding: "15px 18px", color: "#527071" }}>{device.type}</td><td style={{ padding: "15px 18px", color: "#527071" }}>{device.location}</td><td style={{ padding: "15px 18px", color: "#527071" }}>{device.last_seen ? new Date(device.last_seen).toLocaleString() : "-"}</td><td style={{ padding: "15px 18px" }}><span style={{ color: device.status === "Online" ? "#0f766e" : "#b4532f", background: device.status === "Online" ? "#e6f7f3" : "#fff1eb", borderRadius: 999, padding: "6px 9px", fontSize: 12, fontWeight: 700 }}>● {device.status}</span></td><td style={{ padding: "15px 18px", whiteSpace: "nowrap" }}><button type="button" onClick={(event) => { event.stopPropagation(); toggleDevice(device); }} style={{ ...buttonStyle, padding: "8px 10px", color: "#0f766e", background: "#e6f7f3", marginRight: 8 }}>{device.status === "Online" ? "Turn off" : "Turn on"}</button><button type="button" onClick={(event) => { event.stopPropagation(); removeDevice(device.id); }} style={{ ...buttonStyle, padding: "8px 10px", color: "#b91c1c", background: "#fff1f2" }}>Remove</button></td></tr>)}{!loading && filteredDevices.length === 0 ? <tr><td colSpan="6" style={{ padding: 35, textAlign: "center", color: "#648181" }}>No devices match your search.</td></tr> : null}</tbody></table></div>
        </div>
      </section>
    </main>
  );
}
