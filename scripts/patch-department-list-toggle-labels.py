from pathlib import Path

path = Path('components/department-module-polished.tsx')
text = path.read_text()
old = "              <small>Incidental Charges : <b>{d.incidentalCharges.length}</b> | Reason : <b>{d.reasons.length}</b> | Sales Channel : <b>{cleanSalesChannels(d.salesChannels).length}</b></small>"
new = """              {(() => {
                const details = [
                  (d.allowIncidentalCharges ?? d.incidentalCharges.length > 0) ? <span key=\"incidental\">Incidental Charges : <b>{d.incidentalCharges.length}</b></span> : null,
                  (d.allowReason ?? d.reasons.length > 0) ? <span key=\"reason\">Reason : <b>{d.reasons.length}</b></span> : null,
                  (d.allowSalesChannel ?? cleanSalesChannels(d.salesChannels).length > 0) ? <span key=\"sales\">Sales Channel : <b>{cleanSalesChannels(d.salesChannels).length}</b></span> : null,
                  (d.serviceRequest ?? false) ? <span key=\"service\">Service Request</span> : null,
                ].filter(Boolean);
                return details.length ? <small>{details.map((item, index) => <span key={index}>{index > 0 ? ' | ' : ''}{item}</span>)}</small> : null;
              })()}"""
if old not in text:
    raise SystemExit('Department listing summary anchor not found')
path.write_text(text.replace(old, new, 1))
