export function describePieSlice(cx, cy, radius, startAngle, endAngle) {
  const startRadians = (startAngle * Math.PI) / 180;
  const endRadians = (endAngle * Math.PI) / 180;
  const start = {
    x: cx + radius * Math.cos(startRadians),
    y: cy + radius * Math.sin(startRadians)
  };
  const end = {
    x: cx + radius * Math.cos(endRadians),
    y: cy + radius * Math.sin(endRadians)
  };
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
}
