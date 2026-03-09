import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { buttonMotionProps } from "./PageWrapper";
import { getIcon } from "../lib/icons";

const MotionLink = motion.create(Link);
const MotionAnchor = motion.a;

function ButtonContent({ iconName, children }) {
  const Icon = getIcon(iconName);

  return (
    <>
      <Icon className="button-icon" size={18} strokeWidth={2.2} />
      <span>{children}</span>
    </>
  );
}

function ActionButton({
  to,
  href,
  iconName = "action",
  className = "nav-button",
  type = "button",
  children,
  ...rest
}) {
  if (to) {
    return (
      <MotionLink className={className} to={to} {...buttonMotionProps} {...rest}>
        <ButtonContent iconName={iconName}>{children}</ButtonContent>
      </MotionLink>
    );
  }

  if (href) {
    return (
      <MotionAnchor className={className} href={href} target="_blank" rel="noreferrer" {...buttonMotionProps} {...rest}>
        <ButtonContent iconName={iconName}>{children}</ButtonContent>
      </MotionAnchor>
    );
  }

  return (
    <motion.button className={className} type={type} {...buttonMotionProps} {...rest}>
      <ButtonContent iconName={iconName}>{children}</ButtonContent>
    </motion.button>
  );
}

export default ActionButton;
