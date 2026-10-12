# Abhinnati — Knowledge Transfer

A plain-language guide to what Abhinnati is, who it is for, and what the product does today. Written for someone who needs to explain, demo, or hand over the product without reading the code.

---

## 1. What Abhinnati is

**Abhinnati** (अभिजात उन्नती — *Abhijat Unnati*, “refined progress”) is a neighbourhood app for Maharashtra.

It does two jobs in one place:

1. **Find and book local services.** A resident can discover a bakery, a plumber, a cleaner, an electrician, a tiffin service, or a legal advisor in their area, pick a time, and book them.
2. **Stay connected to the neighbourhood.** The same person can see local posts, ask a question, share a local issue, and see nearby businesses highlighted in the feed.

The app is **Marathi first**. English is always available. Almost every screen can be read in either language, and the person can switch at any time.

It is an **Android mobile app**. The same phone number can be used as a **resident** (the customer) and, after verification, as a **vendor** (the business owner). The person switches between the two inside the app. They do not need two accounts.

The starting neighbourhood in the product is **Bandra West, Mumbai**, with other areas in Mumbai, Pune, and Nashik already set up.

---

## 2. Who uses it

| Person | What they want | What they see in the app |
| --- | --- | --- |
| **Resident** | A trusted person or shop nearby, and a way to talk to the neighbourhood | Home feed, Explore, Bookings, Profile |
| **Vendor** | Customers from the area, a way to accept jobs, and control over when they are available | Home (shop dashboard), Bookings, Services, Profile |
| **Abhinnati team (admin)** | Decide which businesses are allowed to go live | Reviews identity documents and approves or rejects a vendor |

A vendor is still a resident. After their business is approved, they can jump into vendor mode to run the shop, then jump back to browse and book like everyone else.

---

## 3. The idea in one story

Sneha lives in Bandra West. She opens Abhinnati, chooses Marathi, and confirms her phone with a one-time code. She picks her area.

On **Home**, she sees what people in Bandra West are posting, and a spotlight for a nearby bakery. She opens **Explore**, searches “cake”, and finds **Aai’s Bakery** (आईची बेकरी). She opens the shop, reads the description, looks at services and reviews, and books a custom cake for a date and time. She pays, and the booking shows up under **Bookings** as pending until the bakery accepts it.

The bakery owner uses the same kind of account. After identity checks are approved, they open **vendor mode**. A new request appears on their dashboard. They accept it, call the customer if needed, mark when they start travelling, when work starts, and when the job is done. Sneha can then leave a star rating and a comment. The bakery can reply.

That loop — discover locally, book, accept, complete, review — is the product.

---

## 4. Language, place, and trust

Three ideas shape every screen.

**Language.** The first thing a new person does is choose Marathi or English. Marathi is the default. Names, descriptions, posts, and notifications are stored in both languages so the app can show the right one. The typeface is Mukta, which is built for Devanagari, so Marathi text stays readable.

**Place.** The app is organised by **area**, not by the whole city. A resident picks their neighbourhood (or uses their phone location to find nearby areas). Explore, the feed, and business listings are tied to that area. They can switch area later from the top of the screen.

**Trust.** A business is not simply listed because someone typed a name. The owner submits identity documents. Until Abhinnati approves them, the business stays “under review” and cannot fully operate as a live vendor. Approved businesses show as verified in their area.

---

## 5. How a new person joins

1. **Splash.** The Abhinnati logo appears while the app gets ready.
2. **Language.** Choose मराठी or English.
3. **Phone.** Enter a mobile number and confirm it with a one-time code (OTP).
4. **Name.** Tell the app what to call them.
5. **Area.** Search for a neighbourhood, or use current location to see nearby areas, then pick one.
6. **Permissions.** The app asks for location (so it can suggest the right neighbourhood) and notifications (so booking and area updates can reach them). Both can be allowed or skipped in a controlled way.
7. **Home.** A brand-new person may see an empty neighbourhood feed, with prompts to write the first post or look at nearby areas and new businesses. Once the area has activity, Home shows the live feed.

---

## 6. The resident app

The bottom bar has four places.

### Home — माझा परिसर

This is the neighbourhood feed.

- Posts from people in the area, with likes and comments.
- Post types such as a **local issue** or an **ask** (a question to neighbours).
- Business highlights mixed into the feed, so a nearby shop can be seen without opening Explore.
- A locality name at the top. Tapping it lets the person switch area.
- A bell for notifications.
- A way to write a new post.
- Opening a post shows the full thread and a place to comment.

If the area is still quiet, Home explains that and offers:

- Create the first post.
- Look at nearby areas (about 5 km).
- See new businesses near them.

### Explore — शोधा

This is the service directory.

- Search for a service or a business name.
- Browse by category.
- See businesses that are popular nearby, with rating and distance.
- Open a business profile.
- Pull to refresh, and retry if the list fails to load.
- If nothing matches, the screen says no providers were found.

**Categories a resident can browse** (as built in the app):

| Category | Examples of what it covers |
| --- | --- |
| Plumbing & masonry | Pipe repair, tank cleaning |
| Electrical works | Fan repair, short-circuit work |
| Home cleaning | Sofa and carpet cleaning |
| Home-cooked tiffin | Veg thali and similar meals |
| Bakery, cakes, desserts | Custom cakes and bakery orders |
| Legal advice | Rent agreements, a first consultation |
| Other everyday needs | Drinking-water jars, bicycle servicing, and similar local listings |

The Explore screen is also prepared to show a wider set of neighbourhood categories over time (health, beauty, education, pets, events, fitness, and others). The ones above are the ones the current product is actually organised around.

**A business profile shows:**

- Name and description in the selected language.
- Whether the business is verified.
- Photos, logo, and cover image when the owner has added them.
- The list of services, each with a price and how long it takes.
- Ratings and reviews.
- A clear signal if the shop cannot take a booking (for example, fully booked, or away on vacation).
- A button to book a chosen service.

### Bookings — बुकिंग्स

Every order the resident has made lives here, split into **Upcoming** and **Past**.

Each booking shows a status:

| Status | What it means for the resident |
| --- | --- |
| Pending | The request is with the business. They have not accepted yet. |
| Confirmed | The business accepted. The slot is on. |
| Completed | The job is done. The resident can rate it. |
| Cancelled | The booking was cancelled. |
| Declined | The business turned the request down. |

Opening a booking shows the service, date, time, notes, and payment. While a booking is still changeable, the resident can cancel it. There is a short window for that (about five minutes after it is created, unless a later cutoff is set). After the job is done, they can give stars and write a review.

If they have never booked, the screen invites them to explore services.

### Profile — प्रोफाईल

- Name, phone, and area.
- Language switch (मराठी / EN), also available from this screen and from a language control on other screens.
- **Register a business**, **check verification status**, or **switch to vendor mode**, depending on where they are in the vendor journey.
- Edit profile.
- Saved items.
- Settings.
- Help and support.
- Notifications bell.

---

## 7. How a booking works

This is the main money-and-trust flow. Walk through it in this order when you demo.

1. From Explore (or a spotlight on Home), open a business.
2. Choose a service. Example: custom cake, ₹600, about 45 minutes.
3. **Choose a slot.** Pick one of the next few days, then a free time. The resident can add a note: house address, landmark, or what they need.
4. **Pay.** They see a total and choose UPI, card, or wallet, then confirm payment.
5. **Success or failure.** A success screen confirms the booking. If payment does not go through, a failure screen lets them try again. Cash is offered as a fallback when online payment fails.
6. The booking appears under Bookings as **pending**.
7. The vendor accepts or declines.
8. After accept, the vendor moves the job forward: **start travel → start work → mark completed**.
9. The resident sees that progress on the booking detail.
10. When it is completed, the resident writes a review. The vendor can reply.

What the resident is paying for is the chosen service at the chosen time. The note they type is visible to the vendor on the order.

**Be clear in a handover:** the payment screen is part of the product and supports UPI, card, and wallet choices. The live card network (a real Razorpay-style charge) is represented in the app as a secure payment step. Treat “money actually settled to a bank account” as something operations must confirm before promising it to a shopkeeper.

---

## 8. The neighbourhood feed

The feed is how Abhinnati stays useful even when someone is not booking today.

A resident can:

- Read posts from their area.
- Like a post and open comments.
- Create a post, including a topic and a photo.
- See how long ago something was posted (“5 minutes ago”, and the Marathi equivalent).

Posts and business cards can sit in the same scroll, so the neighbourhood and the marketplace are not two separate apps.

Saved posts and saved businesses are a profile entry (“Saved”). Treat that list as a light feature: the menu item is there; do not describe a full wishlist product unless you have checked it in a demo.

---

## 9. The vendor app

A resident becomes a vendor from Profile.

### Step A — Register the business

They enter:

- Business name.
- Category (bakery, tiffin, plumbing, electrical, cleaning, legal, and similar).
- Area they serve.
- Identity proof. The main document asked for on this screen is **Aadhaar**.

Food businesses (bakery, home-cooked tiffin) are marked as needing an **FSSAI** licence as well. Other document types the system can hold include PAN, GST, shop licence, electricity bill, and trade licence.

They submit the registration **for review**.

### Step B — Wait for approval

Until the team approves them, the profile says **Under review**. They can open a status screen to see whether documents are still being checked, approved, or rejected (with a reason, if rejected, so they can send them again).

They cannot run the shop dashboard as an approved vendor until status is **Approved**.

### Step C — First-time shop setup

After approval, the owner is walked through setting up the public shop:

1. **Location** — the exact address residents will see. They can search, use GPS, and adjust the pin.
2. **Cover photo** — the large image on the profile.
3. **Logo**.
4. **Gallery** — more photos, and photos or videos of previous work.
5. **Services** — each offering has a name, description, price, and duration, in English and Marathi.

They can skip ahead to the dashboard and finish setup later. They can also come back and edit the business: name, category, description, address, hours, phone, gallery, and cover photo.

### Vendor home — माझे दुकान

This is the shop’s front desk.

- Business name, area, and a “verified / live in this area” line.
- How many **new requests** are waiting.
- Total bookings and average rating.
- A banner when new requests need a decision, with a button to review them.
- **Today’s schedule** of accepted jobs.
- **Vacation mode.** When this is on, residents cannot place new bookings. The owner sets start date, end date, and a reason.
- A switch back to resident (user) mode.

### Vendor bookings

Requests are grouped so the owner can work the queue:

- **New** — accept or decline.
- **Upcoming** — jobs already accepted.
- **History** — finished work.

Opening one request shows:

- Customer name and phone, with a **call** button.
- Service, date, time, and the customer’s note.
- Amount and whether it was paid online or as cash on delivery.
- Actions that match the stage: accept, decline, start travel, start work, mark completed.

### Services

The catalogue of what the shop sells. The owner can add a service, edit it, or pause it so it no longer appears for booking. Each service has Marathi and English names and descriptions, a price, and a duration in minutes.

### Availability

Separate from vacation mode, the owner controls when they can be booked:

- **Weekly hours** — open and close time for each day, or mark a day closed. Sunday starts as closed; other days start around 9:00 to 6:00, and the owner can change that. A sample bakery in the system is open 9:00 to 21:00 all week.
- **Block a whole date** — for a festival or a day off, with a reason.
- **Block a time range** on a date — for example 2:00 to 5:00 for a personal errand.
- **Service radius** — how far they travel. The default is 5 km.
- **Emergency availability** — a status the owner can set when they are or are not taking urgent work.

Blocked dates and vacation mode are why a resident sometimes sees no free slots, or cannot book at all.

### Reviews

The owner sees ratings and comments on the business and can write a reply. The reply is its own screen, so they can read the review carefully before answering.

### Vendor profile

Same person, shop hat on: business card with “Approved”, switch back to user mode, edit profile, language, saved, settings, help, and log out.

---

## 10. Notifications, settings, and help

**Notifications** cover four kinds of news:

- Booking updates (request accepted, job moving, and similar).
- Community activity in the area.
- Spotlights (a business being highlighted).
- System messages from Abhinnati.

In Settings the resident can turn these groups on or off:

- Booking updates (on by default).
- Area activity (on by default).
- Promotions (off by default).

Settings also has:

- Privacy and data.
- Delete account (with a confirmation; this signs them out).
- Log out.
- The app version, shown as **Abhinnati v1.0.0**.

**Help & support** lists common questions:

- How do I book a service?
- Cancellations and refunds.
- Payments and receipts.
- Vendor verification.
- Report a problem.

There is also a “chat with our team” entry, shown as available 9 AM to 9 PM. In a handover, describe Help as the place those topics will live. Do not promise a staffed live chat until that desk is actually operating.

The app can also show an offline screen when the phone has no connection, so the person knows the problem is the network.

---

## 11. Areas already in the product

These neighbourhoods are set up so a person can select them and so businesses can be tied to them.

**Mumbai:** Bandra West, Bandra East, Khar, Santacruz, Dadar, Girgaon.

**Pune:** Kothrud, Deccan Gymkhana, PCMC (Pimpri-Chinchwad), Baner, Wakad, Hinjewadi, Hadapsar, Ravet.

**Nashik:** Panchavati.

Each area has a centre point and a radius (roughly 3 to 6 km). That radius is how “nearby” is decided. The sample live business, Aai’s Bakery, sits in **Bandra West** (Hill Road) and serves about **5 km**.

---

## 12. A sample business you can use in a demo

| Detail | Example |
| --- | --- |
| Name | Aai’s Bakery / आईची बेकरी |
| What they say | Fresh cakes, pastries, and bakery items every day |
| Area | Bandra West, Mumbai |
| Example service | Custom cake order / सानुकूल केक ऑर्डर — ₹600, about 45 minutes |
| Hours in the sample data | 9:00 to 21:00, all seven days |
| Verification | Approved |
| Contact | WhatsApp and email on the business profile |

Use this shop when you need a concrete walkthrough. Other sample providers in the app cover plumbing, legal advice, cleaning, tiffin, electrical work, and small local goods.

---

## 13. What each role is allowed to do

**Resident**

- Choose language and area.
- Read and write in the neighbourhood feed.
- Search and open businesses.
- Book, pay, track, cancel (inside the allowed window), and review.
- Turn notifications on or off, edit profile, get help, log out.
- Start vendor registration.

**Vendor** (only after approval)

- Everything a resident can do, plus vendor mode.
- Maintain the shop profile, photos, location, and hours.
- Add, edit, and pause services.
- Accept or decline bookings and move a job through travel, work, and completion.
- Call the customer from the order.
- Turn on vacation mode and block dates or time slots.
- Set how far they will travel.
- Read reviews and reply.

**Admin** (Abhinnati team, not a tab inside the resident app)

- Approve or reject a vendor after looking at their documents.
- Manage service categories (turn them on or off, name them in both languages, set the order they appear).

A rejected document can be sent again. The vendor sees the reason.

---

## 14. How to explain Abhinnati in five minutes

Use this script.

> Abhinnati is a Marathi-first app for one neighbourhood at a time. Residents discover trusted local shops and home services, book a time, and pay. The same app has a local feed, so the neighbourhood can post questions and updates, not only buy things.
>
> Shop owners verify who they are, set up their services and hours, and accept bookings from people nearby. They can pause the shop for a vacation or block a day. When the job is done, the customer leaves a review and the shop can reply.
>
> One phone number does both. You live in the area as a resident, and if you run a shop you switch into vendor mode after we approve you.
>
> We start in places like Bandra West, with Pune and Nashik areas already in the product. The language is Marathi by default, and English is one tap away.

---

## 15. What to show in a demo

**Resident path (about 5 minutes)**

1. Open the app, choose Marathi, then switch to English so the room can follow.
2. Sign in and land on Bandra West.
3. Scroll Home: a post and a business spotlight.
4. Open Explore, pick a category or search “cake”.
5. Open Aai’s Bakery. Show services, rating, and the book button.
6. Pick a date, a time, and a short note.
7. Complete payment and show the booking under Upcoming.
8. Open Profile and point at “Register your business” or “Switch to vendor mode”.

**Vendor path (about 5 minutes)**

1. Switch to vendor mode.
2. Show the dashboard: pending requests, today’s schedule, vacation switch.
3. Open a request, accept it, and show call / start travel / start work / complete.
4. Open Services and show add or edit.
5. Open availability: weekly hours, a blocked date, service radius.
6. Show a review and the reply screen.
7. Switch back to user mode.

---

## 16. Words the team should use the same way

| Word in the app | Say this |
| --- | --- |
| Resident / user mode | The person using Abhinnati as a neighbour and customer |
| Vendor / vendor mode | The same person running their shop or service |
| Area / परिसर | The neighbourhood the app is currently showing |
| Service | One bookable offering, with its own price and duration |
| Booking / order | A request for a service at a date and time |
| Slot | A free time on a given day |
| KYC / verification | The identity check before a business can go live |
| Spotlight | A featured nearby business, shown on Home or in notifications |
| Vacation mode | The shop is away; new bookings are stopped |
| Verified / approved | Abhinnati has accepted the business |

Avoid calling vendors “drivers” or the feed “social media”. It is a neighbourhood board plus a local services desk.

---

## 17. What is solid, and what to be careful promising

**Solid in the product today**

- Marathi and English across the main journeys.
- Phone sign-in, name, area selection, and permission prompts.
- Resident tabs: Home, Explore, Bookings, Profile.
- Search, categories, business profiles, and booking a slot.
- Booking statuses from pending through completed, declined, or cancelled.
- Reviews and vendor replies.
- Vendor registration, document upload, and an approval status.
- Vendor dashboard, services, availability, vacation mode, and job tracking.
- Notification preferences, settings, help topics, and log out.
- Sample areas across Mumbai, Pune, and Nashik.

**Talk about these carefully until operations confirms they are live**

- **Real money settlement.** The pay screen and success/failure screens exist. Confirm with the team before telling a vendor that UPI or card money is already reaching their account.
- **Live support chat.** The help screen offers a chat. Confirm staffing and hours before advertising “we answer from 9 to 9”.
- **Saved list.** The menu item exists. Confirm it opens a real list before featuring it.
- **Push notifications on a real phone.** The settings and the inbox exist. Confirm that a booking change actually pings the phone in the build you are demoing.
- **Admin desk.** Approval exists as a team action. There is no separate admin mobile app in the resident experience; approval is an internal step.

If a stakeholder asks “is this the finished company or the product we can click through?”, the honest answer is: **the resident and vendor journeys are built and can be walked end to end. Payments, support chat, and a staffed approval desk need an operations check before they are promised as live services.**

---

## 18. What Abhinnati is not

- It is not a city-wide delivery app like a food aggregator that sends its own riders. The business does the work, in and around its area.
- It is not only a chat group. The feed matters, but the booking desk is the core.
- It is not English-only. If a screen is shown only in English during a Marathi demo, that is a gap to flag, not the design.
- It is not two apps. Resident and vendor are two modes of one Abhinnati account.

---

## 19. Handover checklist

Use this when you sit with the next person.

- [ ] They can say what Abhinnati is in one sentence.
- [ ] They can tell a resident story and a vendor story without opening a laptop.
- [ ] They know Marathi is the default and how to switch language.
- [ ] They know the four resident tabs and the four vendor tabs.
- [ ] They can explain pending → confirmed → completed, and what declined and cancelled mean.
- [ ] They can explain why a business is “under review” and cannot switch to vendor mode yet.
- [ ] They can explain vacation mode and blocked dates in plain words.
- [ ] They know which areas are already in the product.
- [ ] They will not promise live payouts, live chat, or a finished saved-list until those are confirmed.
- [ ] They know who approves a new vendor (the Abhinnati team, not the resident).

---

*This note describes the Abhinnati Android app as it is built: a bilingual, area-based marketplace and neighbourhood feed, with a verified vendor mode for local businesses.*
