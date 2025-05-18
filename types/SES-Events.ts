export type SESDeliveryStauts =
  | "BOUNCED"
  | "COMPLAINED"
  | "DELIVERED"
  | "SENT"
  | "REJECTED"
  | "OPENED"
  | "CLICKED"
  | "RENDERING_FAILED"
  | "DELIVERY_DELAYED"
  | "SUBSCRIBED";

export type SESEventType =
  | "Bounce"
  | "Complaint"
  | "Delivery"
  | "Send"
  | "Reject"
  | "Open"
  | "Click"
  | "Rendering Failure"
  | "DeliveryDelay"
  | "Subscription";

export type SESEventTypeKey =
  | "bounce"
  | "complaint"
  | "delivery"
  | "send"
  | "reject"
  | "open"
  | "click"
  | "failure"
  | "deliveryDelay"
  | "subscription";

export const SESEventTypeKeyMap: Record<SESEventType, string> = {
  Bounce: "bounce",
  Complaint: "complaint",
  Delivery: "delivery",
  Send: "send",
  Reject: "reject",
  Open: "open",
  Click: "click",
  "Rendering Failure": "failure",
  DeliveryDelay: "deliveryDelay",
  Subscription: "subscription",
};

type SESBaseEvent = {
  mail: SESMailObject;
};

// Individual event types
type SESBounceEvent = SESBaseEvent & {
  eventType: "Bounce";
  bounce: BounceObject;
};

type SESComplaintEvent = SESBaseEvent & {
  eventType: "Complaint";
  complaint: ComplaintObject;
};

type SESDeliveryEvent = SESBaseEvent & {
  eventType: "Delivery";
  delivery: DeliveryObject;
};

type SESSendEvent = SESBaseEvent & {
  eventType: "Send";
  send: SendObject;
};

type SESRejectEvent = SESBaseEvent & {
  eventType: "Reject";
  reject: RejectObject;
};

type SESOpenEvent = SESBaseEvent & {
  eventType: "Open";
  open: OpenObject;
};

type SESClickEvent = SESBaseEvent & {
  eventType: "Click";
  click: ClickObject;
};

type SESRenderingFailureEvent = SESBaseEvent & {
  eventType: "Rendering Failure";
  failure: RenderingFalureObject;
};

type SESDeliveryDelayEvent = SESBaseEvent & {
  eventType: "DeliveryDelay";
  deliveryDelay: DeliveryDelayObject;
};

type SESSubscriptionEvent = SESBaseEvent & {
  eventType: "Subscription";
  subscription: SubscriptionObject;
};

// Union type of all possible events
export type SESEventDetails =
  | SESBounceEvent
  | SESComplaintEvent
  | SESDeliveryEvent
  | SESSendEvent
  | SESRejectEvent
  | SESOpenEvent
  | SESClickEvent
  | SESRenderingFailureEvent
  | SESDeliveryDelayEvent
  | SESSubscriptionEvent;

// Type guard functions
export const isBounceEvent = (
  event: SESEventDetails,
): event is SESBounceEvent => event.eventType === "Bounce";

type SESEventHandlers<T> = {
  onBounce?: (event: SESBounceEvent) => T;
  onComplaint?: (event: SESComplaintEvent) => T;
  onDelivery?: (event: SESDeliveryEvent) => T;
  onSend?: (event: SESSendEvent) => T;
  onReject?: (event: SESRejectEvent) => T;
  onOpen?: (event: SESOpenEvent) => T;
  onClick?: (event: SESClickEvent) => T;
  onRenderingFailure?: (event: SESRenderingFailureEvent) => T;
  onDeliveryDelay?: (event: SESDeliveryDelayEvent) => T;
  onSubscription?: (event: SESSubscriptionEvent) => T;
  onDefault?: (event: SESEventDetails) => T;
  onAny?: (event: SESEventDetails) => T;
};

export const handleSESEvent = <T>(
  event: SESEventDetails,
  handlers: SESEventHandlers<T>,
): T | undefined => {
  // in case we want to do something for every event
  handlers.onAny?.(event);
  switch (event.eventType) {
    case "Bounce":
      return handlers.onBounce?.(event);
    case "Complaint":
      return handlers.onComplaint?.(event);
    case "Delivery":
      return handlers.onDelivery?.(event);
    case "Send":
      return handlers.onSend?.(event);
    case "Reject":
      return handlers.onReject?.(event);
    case "Open":
      return handlers.onOpen?.(event);
    case "Click":
      return handlers.onClick?.(event);
    case "Rendering Failure":
      return handlers.onRenderingFailure?.(event);
    case "DeliveryDelay":
      return handlers.onDeliveryDelay?.(event);
    case "Subscription":
      return handlers.onSubscription?.(event);
    default:
      return handlers.onDefault?.(event);
  }
};

export type SESMailHeaders = { name: string; value: string };
export type SESMailCommonHeaders = {
  from: string[];
  to: string[];
  messageId: string;
  subject?: string;
  replyTo?: string[];
};

export type SESMailObject = {
  timestamp: string; // ISO date string
  messageId: string;
  source: string; // FROM email
  sourceArn: string;
  sendingAccountId: string;
  destination: string[]; // TO email(s)
  headersTruncated: boolean;
  headers: SESMailHeaders[];
  commonHeaders: SESMailCommonHeaders;
  tags: Record<string, string[]>;
};

export type BounceObject = {
  bounceType: BounceType;
  bounceSubType: BounceSubType;
  bouncedRecipients: BouncedRecipient[];
  timestamp: string;
  feedbackId: string;
  reportingMTA: string;
};

export type BouncedRecipient = {
  emailAddress: string;
  action: string;
  status: string;
  diagnosticCode: string;
};

export type BounceType = "Undetermined" | "Permanent" | "Transient";

export type BounceSubType =
  | "Undetermined"
  | "General"
  | "NoEmail"
  | "Suppressed"
  | "OnAccountSuppressionList"
  | "MailboxFull"
  | "MessageTooLarge"
  | "CustomTimeoutExceeded"
  | "ContentRejected"
  | "AttachmentRejected";

export type ComplaintObject = {
  complainedRecipients: ComplainedRecipient[];
  timestamp: string; // ISO datetime
  feedbackId: string;
  userAgent: string;
  complaintFeedbackType: ComplaintTypes;
  complaintSubType: ComplaintSubtype;
  arrivalDate: string;
};

export type ComplainedRecipient = {
  emailAddress: string;
};

export type ComplaintTypes =
  | "abuse"
  | "auth-failure"
  | "fraud"
  | "not-spam"
  | "other"
  | "virus";

export type ComplaintSubtype = null | " OnAccountSuppressionList";

export type SendObject = Record<string, string>;
export type DeliveryObject = {
  timestamp: string;
  processingTimeMillis: number;
  recipients: string[];
  smtpResponse: string;
  reportingMTA: string;
};

export type RejectObject = {
  reason: "Bad content";
};

export type OpenObject = {
  ipAddress: string;
  timestamp: string;
  userAgent: string;
};

export type ClickObject = {
  ipAddress: string;
  timestamp: string;
  userAgent: string;
  link: string;
  linkTags: string[];
};

export type RenderingFalureObject = {
  templateName: string;
  errorMessage: string;
};

export type DelayType =
  | "InternalFailure"
  | "General "
  | "MailboxFull "
  | "SpamDetected "
  | "RecipientServerError"
  | "IPFailure"
  | "TransientCommunicationFailure"
  | "BYOIPHostNameLookupUnavailable"
  | "Undetermined"
  | "SendingDeferral";

export type DelayedRecipients = {
  emailAddress: string;
  status: string;
  diagnosticCode: string;
};

export type DeliveryDelayObject = {
  timestamp: string;
  delayType: DelayType;
  expirationTime: string;
  delayedRecipients: DelayedRecipients[];
};

export type SubscriptionPreference = {
  unsubscribeAll: boolean;
  topicSubscriptionStatus: {
    topicName: string;
    subscriptionStatus: "OptOut" | "OptOut";
  }[];
};

export type SubscriptionObject = {
  contactList: string;
  timestamp: string;
  source: string;
  newTopicPreferences: SubscriptionPreference;
  oldTopicPreferences: SubscriptionPreference;
};
