import assert = require("assert");

 export function getEmrPath(emrPathString: string) {
  assert(emrPathString.includes('/'), `EmrPathString must include at least one slash. Instead: ${emrPathString}`);
  const emrPathNameParts = emrPathString.split('/');
  assert(emrPathNameParts.length === 2, `EmrPathString should be split by one slash. Instead: ${emrPathString}`);
  const emrPath = {
    customer: emrPathNameParts[0],
    clientAppId: emrPathNameParts[1]
  };
  return emrPath;
}

export function toBase64Url(obj: object): string {
  const json = JSON.stringify(obj);
  return Buffer.from(json).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
