import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 시드 데이터 생성 시작...');

  // 기존 데이터 삭제 (순서 중요!)
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.device.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.subMenu.deleteMany();
  await prisma.menu.deleteMany();

  // ===== 메뉴 데이터 (실제 대시보드 구조) =====
  console.log('📁 메뉴 생성 중...');

  // 1. 메인 메뉴: 관리
  const adminMenu = await prisma.menu.create({
    data: {
      menuId: 'admin',
      label: '관리',
      icon: 'fa-solid fa-screwdriver-wrench',
      sortOrder: 0,
      isActive: true,
    },
  });

  // 1-1. 서브메뉴: 학생 관리
  const studentSubMenu = await prisma.subMenu.create({
    data: {
      subMenuId: 'admin-student',
      label: '학생 관리',
      sortOrder: 0,
      isActive: true,
      menuId: adminMenu.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      itemId: 'student-management',
      label: '학생 관리',
      sortOrder: 0,
      isActive: true,
      subMenuId: studentSubMenu.id,
    },
  });

  // 1-2. 서브메뉴: 기기 관리
  const deviceSubMenu = await prisma.subMenu.create({
    data: {
      subMenuId: 'admin-device',
      label: '기기 관리',
      sortOrder: 1,
      isActive: true,
      menuId: adminMenu.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      itemId: 'device-management',
      label: '기기 관리',
      sortOrder: 0,
      isActive: true,
      subMenuId: deviceSubMenu.id,
    },
  });

  // 1-3. 서브메뉴: 메뉴 관리
  const menuSubMenu = await prisma.subMenu.create({
    data: {
      subMenuId: 'admin-menu',
      label: '메뉴 관리',
      sortOrder: 2,
      isActive: true,
      menuId: adminMenu.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      itemId: 'menu-management',
      label: '메뉴 관리',
      sortOrder: 0,
      isActive: true,
      subMenuId: menuSubMenu.id,
    },
  });

  // 2. 메인 메뉴: 출석 현황
  const attendanceMenu = await prisma.menu.create({
    data: {
      menuId: 'attendance',
      label: '출석 현황',
      icon: 'fa-solid fa-clipboard-user',
      sortOrder: 1,
      isActive: true,
    },
  });

  // 2-1. 서브메뉴: 실시간 출석
  const realtimeSubMenu = await prisma.subMenu.create({
    data: {
      subMenuId: 'attendance-realtime',
      label: '실시간 출석',
      sortOrder: 0,
      isActive: true,
      menuId: attendanceMenu.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      itemId: 'realtime-monitor',
      label: '실시간 모니터',
      sortOrder: 0,
      isActive: true,
      subMenuId: realtimeSubMenu.id,
    },
  });

  // 2-2. 서브메뉴: 출석 기록
  const attendanceHistorySubMenu = await prisma.subMenu.create({
    data: {
      subMenuId: 'attendance-history',
      label: '출석 기록',
      sortOrder: 1,
      isActive: true,
      menuId: attendanceMenu.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      itemId: 'attendance-viewer',
      label: '출석 조회',
      sortOrder: 0,
      isActive: true,
      subMenuId: attendanceHistorySubMenu.id,
    },
  });

  console.log('✅ 메뉴 생성 완료');

  // ===== 기기 데이터 =====
  console.log('🖥️  기기 생성 중...');

  await prisma.device.createMany({
    data: [
      {
        deviceNumber: '1',
        name: '1층 독서실',
        location: '1층',
        isActive: true,
      },
      {
        deviceNumber: '2',
        name: '2층 자습실',
        location: '2층',
        isActive: true,
      },
      {
        deviceNumber: '3',
        name: '3층 열람실',
        location: '3층',
        isActive: false,
      },
    ],
  });

  console.log('✅ 기기 생성 완료');

  // ===== 학생 데이터 =====
  console.log('👨‍🎓 학생 생성 중...');

  const students = await Promise.all([
    // 1학년 1반
    prisma.student.create({
      data: {
        fingerprintId: 1,
        name: '김민준',
        grade: 1,
        class: 1,
        number: 1,
      },
    }),
    prisma.student.create({
      data: {
        fingerprintId: 2,
        name: '이서연',
        grade: 1,
        class: 1,
        number: 2,
      },
    }),
    prisma.student.create({
      data: {
        fingerprintId: 3,
        name: '박지호',
        grade: 1,
        class: 1,
        number: 3,
      },
    }),
    // 1학년 2반
    prisma.student.create({
      data: {
        fingerprintId: 4,
        name: '최수아',
        grade: 1,
        class: 2,
        number: 1,
      },
    }),
    prisma.student.create({
      data: {
        fingerprintId: 5,
        name: '정민서',
        grade: 1,
        class: 2,
        number: 2,
      },
    }),
    // 2학년 1반
    prisma.student.create({
      data: {
        fingerprintId: 6,
        name: '강하은',
        grade: 2,
        class: 1,
        number: 1,
      },
    }),
    prisma.student.create({
      data: {
        fingerprintId: 7,
        name: '조윤서',
        grade: 2,
        class: 1,
        number: 2,
      },
    }),
    // 2학년 2반
    prisma.student.create({
      data: {
        fingerprintId: 8,
        name: '윤지우',
        grade: 2,
        class: 2,
        number: 1,
      },
    }),
    prisma.student.create({
      data: {
        fingerprintId: 9,
        name: '임서진',
        grade: 2,
        class: 2,
        number: 2,
      },
    }),
    // 3학년 1반
    prisma.student.create({
      data: {
        fingerprintId: 10,
        name: '한지민',
        grade: 3,
        class: 1,
        number: 1,
      },
    }),
    prisma.student.create({
      data: {
        fingerprintId: 11,
        name: '오승호',
        grade: 3,
        class: 1,
        number: 2,
      },
    }),
    // 3학년 2반
    prisma.student.create({
      data: {
        fingerprintId: 12,
        name: '신예은',
        grade: 3,
        class: 2,
        number: 1,
      },
    }),
    prisma.student.create({
      data: {
        fingerprintId: 13,
        name: '홍지훈',
        grade: 3,
        class: 2,
        number: 2,
      },
    }),
  ]);

  console.log('✅ 학생 생성 완료');

  // ===== 샘플 출석 데이터 =====
  console.log('📅 출석 데이터 생성 중...');

  const today = new Date();
  today.setHours(0, 0, 0, 0); // 자정으로 설정
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 오늘 출석 (일부 학생)
  await prisma.attendance.createMany({
    data: [
      {
        studentId: students[0].id, // 김민준
        deviceNumber: '1',
        date: today,
        checkInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0),
        checkOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30, 0),
        studyDuration: 510, // 8시간 30분
      },
      {
        studentId: students[1].id, // 이서연
        deviceNumber: '1',
        date: today,
        checkInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30, 0),
        checkOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0),
        studyDuration: 570, // 9시간 30분
      },
      {
        studentId: students[5].id, // 강하은
        deviceNumber: '2',
        date: today,
        checkInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0),
        checkOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0, 0),
        studyDuration: 360, // 6시간
      },
    ],
  });

  // 어제 출석
  await prisma.attendance.createMany({
    data: [
      {
        studentId: students[0].id, // 김민준
        deviceNumber: '1',
        date: yesterday,
        checkInTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 0, 0),
        checkOutTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 18, 0, 0),
        studyDuration: 540, // 9시간
      },
      {
        studentId: students[2].id, // 박지호
        deviceNumber: '1',
        date: yesterday,
        checkInTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 0, 0),
        checkOutTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0, 0),
        studyDuration: 540, // 9시간
      },
    ],
  });

  console.log('✅ 출석 데이터 생성 완료');

  console.log('');
  console.log('🎉 시드 데이터 생성 완료!');
  console.log('');
  console.log('📊 생성된 데이터:');
  console.log('  - 메뉴: 2개 (관리, 출석 현황)');
  console.log('  - 서브메뉴: 5개');
  console.log('  - 메뉴 아이템: 5개');
  console.log('    • student-management (학생 관리)');
  console.log('    • device-management (기기 관리)');
  console.log('    • menu-management (메뉴 관리)');
  console.log('    • realtime-monitor (실시간 모니터)');
  console.log('    • attendance-viewer (출석 조회)');
  console.log('  - 기기: 3개');
  console.log('  - 학생: 13명');
  console.log('  - 출석 기록: 5개');
}

main()
  .catch((e) => {
    console.error('❌ 시드 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
