// src/utils/errorCodes.js
// Backend error code'larını i18n key'lerine çevirir

export const getErrorMessage = (err, t) => {
  const code = err?.response?.data?.code;
  const fallback = err?.response?.data?.message || t('common.error');

  const codeMap = {
    NO_CLASS_TODAY:        t('errors.noClassToday'),
    NOT_IN_SESSION:        t('errors.notInSession'),
    GPS_TOO_FAR:           t('errors.gpsTooFar'),
    LOCATION_REQUIRED:     t('errors.locationRequired'),
    SESSION_INACTIVE:      t('errors.sessionInactive'),
    INVALID_QR:            t('errors.invalidQR'),
    QR_EXPIRED:            t('errors.qrExpired'),
    WRONG_DATE:            t('errors.wrongDate'),
    OUTSIDE_CLASS_HOURS:   t('errors.outsideClassHours'),
    NOT_ENROLLED:          t('errors.notEnrolled'),
    WRONG_COURSE:          t('errors.wrongCourse'),
    ALREADY_MARKED:        t('errors.alreadyMarked'),
  };

  return code && codeMap[code] ? codeMap[code] : fallback;
};