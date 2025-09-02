CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountHolderName` text NOT NULL,
	`bankName` text NOT NULL,
	`accountNumber` text NOT NULL,
	`accountType` text NOT NULL,
	`IFSCCode` text NOT NULL,
	`UpiId` text
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text,
	`customer_name` text,
	`email_address` text,
	`contact_number` text,
	`address` text,
	`gst_number` text,
	`description` text
);
