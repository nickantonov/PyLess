# 👨‍🏫 Teacher Guide — PyLess

## Overview

As a teacher, you can:
- Create and manage student groups
- Create custom tasks and assign them
- Conduct video lessons with screen sharing
- Upload learning materials
- Track student progress

## Getting Started

### 1. Request Teacher Role

Ask your admin to promote you to teacher:
```
POST /api/auth/promote/{your_id}?role=teacher
```

Or ask admin to set your role in the admin panel.

### 2. Access Teacher Features

After promotion, you'll see new buttons in the header:
- 👑 **Адмін/Ментор** — admin panel access
- 👥 **Групи** — group management
- 🎥 **Уроки** — video lessons

---

## Student Groups

### Create a Group

1. Click **👥 Групи** in header
2. Click **"+ Створити групу"**
3. Enter group name and description
4. Click **"Створити"**

### Add Students

1. Open your group
2. Enter student's email in "Додати учасник"
3. Select role: **Учень** (student)
4. Click **"Додати"**

### Add Co-Teachers

1. Open your group
2. Enter teacher's email
3. Select role: **Викладач** (teacher)
4. Click **"Додати"**

### Remove Members

Click **✕** next to the member's name

---

## Custom Tasks

### Create a Task

1. Click **👑 Адмін** in header
2. Go to **📝 Завдання** tab
3. Fill in:
   - **Назва** — task title
   - **Опис** — what the student needs to do
   - **Початковий код** — starter code
   - **Підказки** — hints (one per line)
   - **Тести** — input and expected output
   - **Складність** — easy/medium/hard
   - **Мова** — Python/HTML/CSS/JavaScript

4. Select assignment:
   - **Всім учням** — assign to all students
   - **Конкретним** — select specific students

5. Click **"Створити завдання"**

### Task Appears in Student Sidebar

Students will see the task under **"Від викладача"** module in their sidebar.

---

## Video Lessons

### Create a Room

1. Click **🎥 Уроки** in header
2. Click **"+ Створити кімнату"**
3. Enter room name
4. Optionally set scheduled time
5. Click **"Створити"**

### Start a Lesson

1. Find your room in the list
2. Click **"Старт"**
3. Share the room code with students

### During a Lesson

- **📷 Toggle Camera** — turn camera on/off
- **🎤 Toggle Mic** — mute/unmute
- **🖥️ Screen Share** — share your screen
- **💬 Chat** — text chat with students
- **📎 Матеріали** — upload files

### Upload Materials

1. Click **📎 Матеріали** in the video room
2. Click **"📤 Завантажити файл"**
3. Select file (PDF, PPTX, images, video, ZIP)

### End a Lesson

Click **"Завершити"** in the room list

---

## Student Progress

### View Progress

1. Click **👑 Адмін** in header
2. Go to **👥 Учні** tab
3. Click on a student to see:
   - Completed tasks
   - XP and level
   - Streak and combo
   - Badges earned

### Add Notes

1. Open student detail
2. Write a note in the text area
3. Click **"Додати"**

---

## Tips

1. **Start with groups** — organize students before assigning tasks
2. **Use progressive tasks** — start easy, increase difficulty
3. **Schedule video lessons** — set times so students can prepare
4. **Upload materials** — share slides, code examples, references
5. **Monitor progress** — check student dashboards regularly
6. **Use AI tutor** — students can get help 24/7
