const TIMES = {
    form:{start:"08:00",end:"08:40"},
    p1:{start:"08:40",end:"09:30"},
    p2:{start:"09:30",end:"10:20"},
    p3:{start:"10:20",end:"11:05"},
    break:{start:"11:05",end:"11:25"},
    p4:{start:"11:25",end:"12:15"},
    p5:{start:"12:15",end:"13:00"},
    lunch:{start:"13:00",end:"14:15"},
    lunchclub:{start:"13:15",end:"13:45"},
    lunchbooster:{start:"13:00",end:"13:30"},
    frenchspeak1:{start:"13:00",end:"13:25"},
    frenchspeak2:{start:"13:25",end:"13:50"},
    p6:{start:"14:15",end:"15:05"},
    p7:{start:"15:05",end:"15:50"},
    activity:{start:"15:50",end:"16:40"},
    longAct:{start:"15:50",end:"17:25"}
};

let TIMETABLE = null;

// ---------- WEEK SELECTOR ----------

function getWeekType() {
    const stored = localStorage.getItem("weekType");
    if (stored === "A" || stored === "B") return stored;
    localStorage.setItem("weekType", "A");
    return "A";
}

function setWeekType(week) { localStorage.setItem("weekType", week); }

function updateWeekToggleUI() {
    const week = getWeekType();
    document.getElementById("weekA").classList.toggle("active", week === "A");
    document.getElementById("weekB").classList.toggle("active", week === "B");
}

// ---------- HELPERS ----------

function parseTimeToday(str, base) {
    const [h,m] = str.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h,m,0,0);
    return d;
}

function diffMinutes(future, now) {
    return Math.round((future - now) / 60000);
}

function diffHours(future, now) {
    return (future - now) / 3600000;
}

function getEventsForToday(now) {
    const day = now.getDay();
    if (day < 1 || day > 5 || !TIMETABLE) return [];

    return (TIMETABLE[getWeekType()][day] || [])
        .filter(e => TIMES[e.type])
        .map(e => {
            const t = TIMES[e.type];
            return {
                label: e.label,
                start: parseTimeToday(t.start, now),
                end: parseTimeToday(t.end, now)
            };
        });
}

// ---------- PiP ----------

const mainLine = document.getElementById("main-line");
const subLine  = document.getElementById("sub-line");

const video = document.getElementById("pipVideo");
const canvas = document.createElement("canvas");
canvas.width = 500;
canvas.height = 220;
const ctx = canvas.getContext("2d");
video.srcObject = canvas.captureStream();

document.body.addEventListener("click", async () => {
    try { await video.requestPictureInPicture(); } catch {}
});

function drawPiP(a,b){
    const topColor = localStorage.getItem("pipTop") || "#00bfa5";
    const bottomColor = localStorage.getItem("pipBottom") || "#a8e6cf";

    const g = ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0, topColor);
    g.addColorStop(1, bottomColor);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.fillText(a, 20, 90);

    ctx.font = "20px Arial";
    ctx.fillStyle = "#555";
    if(b) ctx.fillText(b, 20, 140);

    ctx.font = "18px Arial";
    ctx.fillStyle = "#888";
    ctx.fillText("By Jacob N for Hack Club, 2026", 20, canvas.height-20);
}

// ---------- MAIN ----------

function update(){
    const now = new Date();
    const day = now.getDay();

    if(day === 0 || day === 6){
        const nextMon = new Date(now);
        nextMon.setDate(now.getDate() + ((8 - day) % 7));
        nextMon.setHours(8,0,0,0);
        const h = diffHours(nextMon, now).toFixed(1);
        mainLine.textContent = "WEEKEND";
        subLine.textContent = `Next lesson Monday: Form Time — in ${h} hours`;
        drawPiP(mainLine.textContent, subLine.textContent);
        return;
    }

    const events = getEventsForToday(now);
    const formStart = parseTimeToday(TIMES.form.start, now);
    const lastEnd = events.length ? events[events.length-1].end : formStart;

    if(now < formStart){
        const m = diffMinutes(formStart, now);
        mainLine.textContent = `Form Time in ${m} ${m===1?"minute":"minutes"}`;
        subLine.textContent = "";
        drawPiP(mainLine.textContent, "");
        return;
    }

    if(now <= lastEnd){
        const next = events.find(e => e.start > now);
        if(!next){
            const m = diffMinutes(lastEnd, now);
            mainLine.textContent = `Current: ${events[events.length-1].label}`;
            subLine.textContent = `${m} ${m===1?"minute":"minutes"} left`;
            drawPiP(mainLine.textContent, subLine.textContent);
            return;
        }
        const m = diffMinutes(next.start, now);
        mainLine.textContent = `Next: ${next.label}`;
        subLine.textContent = `${m} ${m===1?"minute":"minutes"}`;
        drawPiP(mainLine.textContent, subLine.textContent);
        return;
    }

    const t = new Date(now);
    t.setDate(now.getDate()+1);
    t.setHours(8,0,0,0);
    const h = diffHours(t, now).toFixed(1);
    mainLine.textContent = "Next lesson tomorrow: Form Time";
    subLine.textContent = `in ${h} hours`;
    drawPiP(mainLine.textContent, subLine.textContent);
}

// ---------- UI ----------

document.getElementById("weekA").onclick = () => {
    setWeekType("A");
    updateWeekToggleUI();
    update();
};

document.getElementById("weekB").onclick = () => {
    setWeekType("B");
    updateWeekToggleUI();
    update();
};

const pipTopInput = document.getElementById("pipTopColor");
const pipBottomInput = document.getElementById("pipBottomColor");

pipTopInput.value = localStorage.getItem("pipTop") || "#00bfa5";
pipBottomInput.value = localStorage.getItem("pipBottom") || "#a8e6cf";

pipTopInput.oninput = e => {
    localStorage.setItem("pipTop", e.target.value);
    drawPiP(mainLine.textContent, subLine.textContent);
};

pipBottomInput.oninput = e => {
    localStorage.setItem("pipBottom", e.target.value);
    drawPiP(mainLine.textContent, subLine.textContent);
};

// ---------- TIMETABLE ----------

fetch("timetable.json")
    .then(r => r.json())
    .then(d => { TIMETABLE = d; update(); })
    .catch(() => { update(); });

updateWeekToggleUI();
setInterval(update, 1000);
update();