"use strict";

function replaceMarkerBlock(bytes, markerName, generatedBody) {
  if (!Buffer.isBuffer(bytes)) throw new Error("marker input must be bytes");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(markerName)) throw new Error("invalid marker name");
  const startText = `<!-- ariadne:${markerName}:start -->`;
  const endText = `<!-- ariadne:${markerName}:end -->`;
  const lines = [];
  let offset = 0;
  while (offset < bytes.length) {
    const lf = bytes.indexOf(0x0a, offset);
    const end = lf === -1 ? bytes.length : lf + 1;
    const contentEnd = lf !== -1 && lf > offset && bytes[lf - 1] === 0x0d ? lf - 1 : (lf === -1 ? end : lf);
    lines.push({ start: offset, end, content: bytes.subarray(offset, contentEnd) });
    offset = end;
  }
  if (bytes.length === 0) lines.push({ start: 0, end: 0, content: Buffer.alloc(0) });
  const owned = [];
  for (let index = 0; index < lines.length; index += 1) {
    const content = lines[index].content;
    const isAscii = content.every((byte) => byte < 0x80);
    const value = isAscii ? content.toString("ascii") : "";
    if (content.equals(Buffer.from(startText))) owned.push({ index, kind: "start" });
    if (content.equals(Buffer.from(endText))) owned.push({ index, kind: "end" });
    if (isAscii && /^<!-- ariadne:[a-z0-9-]+:(?:start|end) -->$/u.test(value) && value !== startText && value !== endText) {
      const between = owned.length === 1 && owned[0].kind === "start";
      if (between) throw new Error("nested or mixed marker pair");
    }
  }
  if (owned.length !== 2 || owned[0].kind !== "start" || owned[1].kind !== "end") {
    throw new Error("missing, duplicate, or reversed marker pair");
  }
  const startLine = lines[owned[0].index];
  const endLine = lines[owned[1].index];
  const startTerminator = bytes.subarray(startLine.content.length + startLine.start, startLine.end);
  const newline = startTerminator.equals(Buffer.from("\r\n")) ? "\r\n" : "\n";
  const body = String(generatedBody).normalize("NFC").replace(/\r\n|\r|\n/gu, newline).replace(new RegExp(`${newline}$`, "u"), "");
  return Buffer.concat([
    bytes.subarray(0, startLine.end),
    Buffer.from(`${body}${newline}`, "utf8"),
    bytes.subarray(endLine.start),
  ]);
}

module.exports = { replaceMarkerBlock };
