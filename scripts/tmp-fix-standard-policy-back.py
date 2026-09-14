from pathlib import Path

# 1) Standard Policy module consumes the top back button when a sub-policy is open.
path = Path('components/hotel-settings-detail.tsx')
text = path.read_text()
old = "function StandardPolicyModule({ onBack, profile, onProfileChange }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile) => void | Promise<void> }) {\n  const [policy, setPolicy] = useState<string | null>(null);\n"
new = "function StandardPolicyModule({ onBack, profile, onProfileChange }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile) => void | Promise<void> }) {\n  const [policy, setPolicy] = useState<string | null>(null);\n  useEffect(() => {\n    const handleStandardPolicyBack = (event: Event) => {\n      if (!policy) return;\n      event.preventDefault();\n      setPolicy(null);\n    };\n    window.addEventListener('hotelx-standard-policy-back', handleStandardPolicyBack);\n    return () => window.removeEventListener('hotelx-standard-policy-back', handleStandardPolicyBack);\n  }, [policy]);\n"
if old not in text:
    raise SystemExit('StandardPolicyModule anchor not found')
text = text.replace(old, new, 1)
path.write_text(text)

# 2) Top HotelX back button gives Standard Policy a chance to handle one-level-back first.
path = Path('app/page.tsx')
text = path.read_text()
old = """                aria-label={view === 'ratepolicy' && rateSetupSection ? 'Back to Rate Setup' : 'Back to Hotel Settings'}
                onClick={() => view === 'ratepolicy' && rateSetupSection ? setRateSetupSection(null) : setView('hotelsettings')}
"""
new = """                aria-label={view === 'ratepolicy' && rateSetupSection ? 'Back to Rate Setup' : view === 'standardpolicy' ? 'Back' : 'Back to Hotel Settings'}
                onClick={() => {
                  if (view === 'standardpolicy') {
                    const standardPolicyBackEvent = new Event('hotelx-standard-policy-back', { cancelable: true });
                    window.dispatchEvent(standardPolicyBackEvent);
                    if (standardPolicyBackEvent.defaultPrevented) return;
                  }
                  view === 'ratepolicy' && rateSetupSection ? setRateSetupSection(null) : setView('hotelsettings');
                }}
"""
if old not in text:
    raise SystemExit('Top back button anchor not found')
text = text.replace(old, new, 1)
path.write_text(text)
