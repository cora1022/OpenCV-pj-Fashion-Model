package com.cora.stylefinder.member.activity;
import com.cora.stylefinder.member.member.User; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
interface SearchHistoryRepository extends JpaRepository<SearchHistory,Long>{List<SearchHistory> findByUserOrderBySearchedAtDesc(User u);}
interface SavedResultRepository extends JpaRepository<SavedResult,Long>{List<SavedResult> findByUserOrderByIdDesc(User u);boolean existsByUserAndCatalogItemId(User u,String id);}
