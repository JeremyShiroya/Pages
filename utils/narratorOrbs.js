// The narrator orbs shown in Listen mode: short looping videos (public/images/Orbs),
// one per narrator, the same ones the Pages website uses. Each is a 384px square
// that is shown cropped to a circle; the matching .webp is its first frame, used
// as the poster so the orb never flashes empty while the video loads.
//
// Liam, Natasha and the phone's built-in voices have no orb of their own, so
// they borrow the closest one rather than showing nothing.
const ORB_FOR_VOICE = Object.freeze({
  'en-US-AvaNeural': 'ava',
  'en-US-AndrewNeural': 'andrew',
  'en-US-BrianNeural': 'brian',
  'en-US-EmmaNeural': 'emma',
  'en-GB-SoniaNeural': 'sonia',
  'en-GB-RyanNeural': 'ryan',
  'pocket:charles': 'charles',
  'kokoro:af_nicole': 'nicole',
  'en-CA-LiamNeural': 'andrew',
  'en-AU-NatashaNeural': 'emma',
})

const DEFAULT_ORB = 'ava'

export const NARRATOR_ORB_NAMES = Object.freeze(['andrew', 'ava', 'brian', 'charles', 'emma', 'nicole', 'ryan', 'sonia'])

export function narratorOrb(voiceId) {
  const name = ORB_FOR_VOICE[String(voiceId || '')] || DEFAULT_ORB
  return {
    name,
    video: `/images/Orbs/${name}.webm`,
    poster: `/images/Orbs/${name}.webp`,
  }
}
