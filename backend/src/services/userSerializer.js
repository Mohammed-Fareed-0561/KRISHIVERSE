/**
 * Shared user serialization for farmer-facing auth/profile responses.
 * Never includes secret-bearing subdocuments (verification / passwordReset)
 * because those paths are `select: false` at the schema level as well.
 */
export function serializeUser(user) {
  if (!user) return null
  const onboarding = user.onboarding || {}
  return {
    id:              user._id,
    name:            user.name,
    email:           user.email,
    role:            user.role,
    language:        user.language,
    location:        user.location,
    emailVerified:   Boolean(user.emailVerifiedAt),
    emailVerifiedAt: user.emailVerifiedAt || null,
    village:         user.village || null,
    crops:           Array.isArray(user.crops) ? user.crops : [],
    farmSize:        user.farmSize?.value !== undefined
      ? { value: user.farmSize.value, unit: user.farmSize.unit || 'acre' }
      : null,
    irrigation:      user.irrigation || null,
    experienceYears: user.experienceYears ?? null,
    notifications:   {
      sms:  user.notifications?.sms  ?? true,
      push: user.notifications?.push ?? true,
    },
    unitPrefs:       {
      area:        user.unitPrefs?.area        || 'acre',
      temperature: user.unitPrefs?.temperature || 'c',
    },
    onboarding:      {
      step:        onboarding.step        ?? 0,
      startedAt:   onboarding.startedAt   || null,
      completedAt: onboarding.completedAt || null,
      abandonedAt: onboarding.abandonedAt || null,
    },
    profileRevision: user.profileRevision ?? 1,
    lastLoginAt:     user.lastLoginAt || null,
    createdAt:       user.createdAt || null,
    updatedAt:       user.updatedAt || null,
  }
}
