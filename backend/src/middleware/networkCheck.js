const { errorResponse } = require('../utils/helpers');

const getAllowedIPs = () => {
  const ips = process.env.ALLOWED_IPS || '';
  return ips.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
};

const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip;
};

const normalizeIP = (ip) => {
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  return ip;
};

const isIPInSubnet = (ip, subnet) => {
  try {
    const [subnetIP, bits] = subnet.split('/');
    const mask = ~(Math.pow(2, 32 - parseInt(bits)) - 1);
    const ipNum = ipToNum(ip);
    const subnetNum = ipToNum(subnetIP);
    return (ipNum & mask) === (subnetNum & mask);
  } catch (e) {
    return false;
  }
};

const ipToNum = (ip) => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const checkNetwork = (req, res, next) => {
  const allowedIPs = getAllowedIPs();

  if (allowedIPs.length > 0) {
    const clientIP = normalizeIP(getClientIP(req));
    const isIPAllowed = allowedIPs.some(allowedIP => {
      if (allowedIP.includes('/')) return isIPInSubnet(clientIP, allowedIP);
      return clientIP === allowedIP;
    });

    if (!isIPAllowed) {
      return errorResponse(res, 'Attendance can only be marked from the school network.', 403);
    }
  }

  next();
};

const checkLocation = (req, res, next) => {
  const schoolLat = parseFloat(process.env.SCHOOL_LAT);
  const schoolLng = parseFloat(process.env.SCHOOL_LNG);
  const radius = parseFloat(process.env.SCHOOL_RADIUS_METERS) || 150;

  if (!schoolLat || !schoolLng) return next();

  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return errorResponse(res, 'Location is required to mark attendance.', 400);
  }

  const distance = getDistanceMeters(schoolLat, schoolLng, parseFloat(latitude), parseFloat(longitude));

  if (distance > radius) {
    return errorResponse(res, `You must be within ${radius} meters of the school. Current distance: ${Math.round(distance)}m.`, 403);
  }

  next();
};

module.exports = { checkNetwork, checkLocation };