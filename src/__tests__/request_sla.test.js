import { describe, it, expect } from "vitest";
import { __internals } from "../App.jsx";

const { computeRequestSla, escalationLevel } = __internals;

const HOUR = 3600000, DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (n) => { const x = new Date(Date.now() + n * DAY); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const emptyDb = { tasks: [], requests: [], projects: [], users: [] };
const req = (over = {}) => ({ id: "r", priority: "normal", status: "pending", createdAt: Date.now() - HOUR, logs: [], agreedDeadline: null, ...over });

describe("computeRequestSla — pha Tiếp nhận (theo giờ)", () => {
  it("normal 1h → trong hạn", () => {
    expect(computeRequestSla(emptyDb, req()).level).toBe("ok");
  });
  it("normal 20h/24h → sắp quá SLA (warn)", () => {
    expect(computeRequestSla(emptyDb, req({ createdAt: Date.now() - 20 * HOUR })).level).toBe("warn");
  });
  it("normal 30h → quá SLA (over)", () => {
    expect(computeRequestSla(emptyDb, req({ createdAt: Date.now() - 30 * HOUR })).level).toBe("over");
  });
  it("urgent 10h (SLA nhận 4h) → quá SLA nặng (severe)", () => {
    const s = computeRequestSla(emptyDb, req({ priority: "urgent", createdAt: Date.now() - 10 * HOUR }));
    expect(s.level).toBe("severe");
    expect(s.phase).toBe("receive");
  });
});

describe("computeRequestSla — pha Thực hiện (theo agreedDeadline)", () => {
  it("accepted, còn hạn → ok", () => {
    const s = computeRequestSla(emptyDb, req({ status: "accepted", agreedDeadline: isoDay(5) }));
    expect(s.phase).toBe("execute");
    expect(s.level).toBe("ok");
  });
  it("processing, đến hạn hôm nay → warn", () => {
    expect(computeRequestSla(emptyDb, req({ status: "processing", agreedDeadline: isoDay(0) })).level).toBe("warn");
  });
  it("processing, quá hạn 3 ngày → severe", () => {
    expect(computeRequestSla(emptyDb, req({ status: "processing", agreedDeadline: isoDay(-3) })).level).toBe("severe");
  });
});

describe("computeRequestSla — pha Nghiệm thu + trạng thái đóng", () => {
  it("delivered 60h (SLA 48h) → over, phase accept", () => {
    const s = computeRequestSla(emptyDb, req({ status: "delivered", deliveredAt: Date.now() - 60 * HOUR }));
    expect(s.phase).toBe("accept");
    expect(s.level).toBe("over");
  });
  it("confirmed → done", () => {
    expect(computeRequestSla(emptyDb, req({ status: "confirmed" })).phase).toBe("done");
  });
  it("rejected/cancelled → closed", () => {
    expect(computeRequestSla(emptyDb, req({ status: "rejected" })).phase).toBe("closed");
    expect(computeRequestSla(emptyDb, req({ status: "cancelled" })).phase).toBe("closed");
  });
});

describe("escalationLevel 0→3", () => {
  it("trong hạn → 0", () => {
    expect(escalationLevel(emptyDb, req())).toBe(0);
  });
  it("warn → 1", () => {
    expect(escalationLevel(emptyDb, req({ createdAt: Date.now() - 20 * HOUR }))).toBe(1);
  });
  it("over → 2", () => {
    expect(escalationLevel(emptyDb, req({ createdAt: Date.now() - 30 * HOUR }))).toBe(2);
  });
  it("severe → 3", () => {
    expect(escalationLevel(emptyDb, req({ priority: "urgent", createdAt: Date.now() - 10 * HOUR }))).toBe(3);
  });
  it("over + thuộc project trọng điểm → nâng lên 3", () => {
    const db = { ...emptyDb, projects: [{ id: "p", priority: "urgent" }] };
    const r = req({ createdAt: Date.now() - 30 * HOUR, projectId: "p" }); // normal, over = 2
    expect(escalationLevel(db, r)).toBe(3);
  });
  it("done/closed → 0", () => {
    expect(escalationLevel(emptyDb, req({ status: "confirmed" }))).toBe(0);
  });
});
