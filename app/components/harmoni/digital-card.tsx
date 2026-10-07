"use client";

import { useState } from "react";
import type { PointerEvent } from "react";
import type { Profile } from "./types";
import { Avatar, CardArtwork, FieldIcon, QrCode } from "./ui";

export default function DigitalCard({
  profile,
  level,
  flipOnClick = true,
}: {
  profile: Profile;
  level?: string;
  flipOnClick?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const name = profile.name || "Harmoni";
  const fields = [
    ...(profile.email ? [{ type: "email" as const, value: profile.email, label: "Work email" }] : []),
    ...(profile.phone ? [{ type: "phone" as const, value: profile.phone, label: "Mobile" }] : []),
    ...profile.fields.filter((field) => field.value.trim()).map((field) => ({
      type: field.id,
      value: field.value,
      label: field.label,
      abbreviation: field.abbreviation,
      color: field.color,
    })),
  ];
  const canFlip = flipOnClick && profile.qrOnBack;

  function tilt(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    event.currentTarget.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
    event.currentTarget.style.setProperty("--mx", `${x * 100}%`);
    event.currentTarget.style.setProperty("--my", `${y * 100}%`);
  }

  function resetTilt(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--ry", "0deg");
    event.currentTarget.style.setProperty("--rx", "0deg");
  }

  return (
    <div
      className={`pass${flipped && canFlip ? " fl" : ""}`}
      onClick={() => canFlip && setFlipped((value) => !value)}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      role={canFlip ? "button" : undefined}
      tabIndex={canFlip ? 0 : undefined}
      aria-label={canFlip ? "Flip your digital card" : undefined}
      onKeyDown={(event) => {
        if (canFlip && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setFlipped((value) => !value);
        }
      }}
    >
      <div className="pi">
        <div className="pf">
          <div className="pa">
            {profile.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.cover} alt="" />
            ) : <CardArtwork variant={profile.art} />}
            <div className="hl" />
            <div className="pm" />
            <div className="ptop">
              <span>Harmoni</span>
              {level ? <em>✦ {level}</em> : null}
            </div>
          </div>
          <div className="pbd">
            <div className="prw">
              <Avatar name={name} photo={profile.photo || undefined} size={92} square={profile.squarePhoto} />
              {profile.logo ? (
                <div className="plg">
                  {profile.logo === "auto" ? (
                    <b>{(profile.company || profile.name || "H")[0].toUpperCase()}</b>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.logo} alt={`${profile.company || name} logo`} />
                  )}
                </div>
              ) : null}
            </div>
            <div className="pn">{name}</div>
            {profile.title || profile.company ? (
              <div className="pt">
                {profile.title}
                {profile.title && profile.company ? <span> at </span> : null}
                {profile.company}
              </div>
            ) : null}
            {profile.headline ? <p className="card-headline">{profile.headline}</p> : null}
            {profile.wants.length ? (
              <div className="hw"><small>Looking for</small>{profile.wants.map((item) => <b key={item}>{item}</b>)}</div>
            ) : null}
            {profile.haves.length ? (
              <div className="hw"><small>Can help with</small>{profile.haves.map((item) => <b key={item}>{item}</b>)}</div>
            ) : null}
            {fields.length ? (
              <div className="frs">
                {fields.map((field) => (
                  <div className="fr" key={field.type}>
                    {field.type === "email" || field.type === "phone" || field.type === "link" ? (
                      <FieldIcon name={field.type} />
                    ) : (
                      <i className="bi custom-field-icon" style={{ background: "color" in field ? field.color : "#9479de" }}>
                        {"abbreviation" in field ? field.abbreviation : field.label.slice(0, 2)}
                      </i>
                    )}
                    <div>
                      <div className="fv">{field.value}</div>
                      <small>{field.label}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {profile.qrOnBack ? (
          <div className="pk">
            <CardArtwork variant={profile.art} />
            <div className="qp">
              <div className="qrw">
                <QrCode seed={`${name}${profile.circle}`} />
              </div>
              <div className="pn card-back-name">{name}</div>
              <div className="tag">Scan to join {profile.circle || "my circle"}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
