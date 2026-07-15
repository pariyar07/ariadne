"use strict";

function replaceMarkerBlock(bytes, markerName, generatedBody) {
  if (!Buffer.isBuffer(bytes)) throw new Error("marker input must be bytes");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(markerName)) throw new Error("invalid marker name");
  const text = bytes.toString("utf8");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/(?<=\r\n|\n)/u);
  const startText = `<!-- ariadne:${markerName}:start -->`;
  const endText = `<!-- ariadne:${markerName}:end -->`;
  const bare = (line) => line.replace(/\r?\n$/u, "");
  const owned = [];
  for (let index = 0; index < lines.length; index += 1) {
    const value = bare(lines[index]);
    if (value === startText) owned.push({ index, kind: "start" });
    if (value === endText) owned.push({ index, kind: "end" });
    if (/^<!-- ariadne:[a-z0-9-]+:(?:start|end) -->$/u.test(value) && value !== startText && value !== endText) {
      const between = owned.length === 1 && owned[0].kind === "start";
      if (between) throw new Error("nested or mixed marker pair");
    }
  }
  if (owned.length !== 2 || owned[0].kind !== "start" || owned[1].kind !== "end") {
    throw new Error("missing, duplicate, or reversed marker pair");
  }
  const body = String(generatedBody).normalize("NFC").replace(/\r\n|\r|\n/gu, newline).replace(new RegExp(`${newline}$`, "u"), "");
  const startLine = lines[owned[0].index];
  const replacement = `${startLine}${body}${newline}${endText}${lines[owned[1].index].endsWith(newline) ? newline : ""}`;
  return Buffer.from(lines.slice(0, owned[0].index).join("") + replacement + lines.slice(owned[1].index + 1).join(""));
}

module.exports = { replaceMarkerBlock };
